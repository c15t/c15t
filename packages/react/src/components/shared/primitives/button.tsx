import type { AllConsentNames } from '@c15t/core';
import { EARLY_TAP_OPT_OUT } from '@c15t/core/surface-actions';
import { forwardRef as createForwardRef, useCallback } from 'react';
import type { FocusEvent, MouseEvent, PointerEvent } from 'react';

import { useIdleDialogWarming, warmDialogChunk } from '~/chunk-warming';
import {
	toSaveUISource,
	useConsentTracking,
} from '~/context/consent-tracking-context';
import { useConsentSaveAction } from '~/draft-context';
import { useSetActiveUI, useDismissNotice } from '~/hooks';
import { useTheme } from '~/hooks/use-theme';
import type { CSSPropertiesWithVars, CSSVariables } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { getSlotProps, mergeSlotProps } from '~/utils/merge-slot-props';

import { Slot } from '../libs/slot';
import * as Button from '../ui/button';
import type { ButtonVariantsProps } from '../ui/button/button';
import type { ConsentButtonElement, ConsentButtonProps } from './button.types';

/**
 * Props that should be filtered out before spreading to the DOM element.
 * These are custom props used for component logic that are not valid HTML attributes.
 */
const NON_DOM_PROPS = [
	'primary',
	'secondary',
	'neutral',
	'consentAction',
	'isPrimary',
	'performDefaultAction',
] as const;

type ConsentActionThemeKey =
	| 'accept'
	| 'reject'
	| 'customize'
	| 'dismiss'
	| 'save';

/**
 * The `data-action` the banner's pre-hydration script replays for each
 * button action. It records the choice from that attribute alone.
 */
const EARLY_TAP_ACTIONS: Partial<Record<string, string>> = {
	'accept-consent': 'accept',
	'dismiss-notice': 'dismiss',
	'open-consent-dialog': 'customize',
	'reject-consent': 'reject',
};

/**
 * Whether the pre-hydration script must leave this button's taps alone.
 * It replays from `data-action` alone, so a button whose own click handler
 * can veto the action, that skips the default action, or whose action does
 * not match its `data-action` opts out. The replay then never records a
 * choice the hydrated button would not.
 */
const skipsEarlyTap = function skipsEarlyTap(params: {
	action: string;
	dataAction: unknown;
	hasClickHandler: boolean;
	performDefaultAction: boolean;
}): boolean {
	const { action, dataAction, hasClickHandler, performDefaultAction } = params;
	const replays =
		!hasClickHandler &&
		(performDefaultAction || action === 'open-consent-dialog') &&
		EARLY_TAP_ACTIONS[action] === dataAction;
	return (
		!replays && Object.values(EARLY_TAP_ACTIONS).includes(String(dataAction))
	);
};

/**
 * Resolves the final variant and mode for a consent button.
 *
 * @param params.consentAction Semantic consent action key.
 * @param params.isPrimary Whether the action is primary in the current UI.
 * @param params.theme Active theme containing `consentActions` overrides.
 * @param params.variant Explicit `ButtonVariantsProps['variant']` override.
 * @param params.mode Explicit `ButtonVariantsProps['mode']` override.
 * @returns The resolved `{ variant, mode }` pair for the button.
 *
 * @remarks
 * Resolution order:
 * 1. Explicit `variant` / `mode` props
 * 2. `theme.consentActions[consentAction]`
 * 3. `theme.consentActions.primary` when the action is primary
 * 4. `theme.consentActions.default`
 * 5. Hardcoded fallback based on `isPrimary`
 */
const resolveConsentButtonStyle = function resolveConsentButtonStyle(params: {
	consentAction?: ConsentActionThemeKey;
	isPrimary?: boolean;
	theme?: ReturnType<typeof useTheme>['theme'];
	variant?: ButtonVariantsProps['variant'];
	mode?: ButtonVariantsProps['mode'];
}) {
	if (params.variant || params.mode) {
		return {
			mode: params.mode ?? 'stroke',
			variant: params.variant ?? 'neutral',
		};
	}

	const consentActions = params.theme?.consentActions;
	// `save` has no theme key; every other action can be themed individually.
	const themedAction =
		params.consentAction && params.consentAction !== 'save'
			? consentActions?.[params.consentAction]
			: undefined;
	// Most specific first; the last entry is the hardcoded fallback.
	const layers = [
		themedAction,
		params.isPrimary ? consentActions?.primary : undefined,
		consentActions?.default,
		{
			mode: 'stroke' as const,
			variant: params.isPrimary ? ('primary' as const) : ('neutral' as const),
		},
	];

	return {
		mode: layers.find((layer) => layer?.mode)?.mode ?? 'stroke',
		variant: layers.find((layer) => layer?.variant)?.variant ?? 'neutral',
	};
};

/**
 * Button component that allows users to reject non-essential cookies.
 *
 * @remarks
 * When clicked, this button saves only necessary cookie consents and closes the banner.
 *
 * @example
 * ```tsx
 * <CookieBannerRejectButton>
 *   Reject All Cookies
 * </CookieBannerRejectButton>
 * ```
 *
 * @public
 */
export const ConsentButton = createForwardRef<
	ConsentButtonElement,
	ConsentButtonProps &
		ButtonVariantsProps & {
			consentAction?: ConsentActionThemeKey;
			isPrimary?: boolean;
			action:
				| 'accept-consent'
				| 'reject-consent'
				| 'custom-consent'
				| 'open-consent-dialog'
				| 'set-consent'
				| 'dismiss-notice';
			category?: AllConsentNames;
			closeConsentDialog?: boolean;
			closeConsentBanner?: boolean;
			performDefaultAction?: boolean;
		}
>(
	(
		{
			asChild,
			className: forwardedClassName,
			style,
			noStyle,
			action,
			slotKey,
			baseClassName,
			variant,
			mode,
			size = 'small',
			consentAction,
			isPrimary,
			onClick: forwardedOnClick,
			onFocus: forwardedOnFocus,
			onPointerEnter: forwardedOnPointerEnter,
			closeConsentBanner = false,
			closeConsentDialog = false,
			performDefaultAction = true,
			category,
			...props
		},
		ref
	) => {
		const saveKernelConsents = useConsentSaveAction();
		// The nearest surface root declares which UI collected the consent.
		const { uiSource: trackedUISource } = useConsentTracking();
		const saveConsents = useCallback(
			(input?: Parameters<typeof saveKernelConsents>[0]) =>
				saveKernelConsents(input, toSaveUISource(trackedUISource)),
			[saveKernelConsents, trackedUISource]
		);
		const setActiveUI = useSetActiveUI();
		const dismissNotice = useDismissNotice();
		const { noStyle: contextNoStyle, theme } = useTheme();
		const { components } = useUIConfig();
		const resolvedButtonStyle = resolveConsentButtonStyle({
			consentAction,
			isPrimary,
			mode,
			theme,
			variant,
		});

		const defaultSlotKey =
			resolvedButtonStyle.variant === 'primary'
				? 'button.primary'
				: 'button.secondary';

		const slotProps = getSlotProps(components, slotKey ?? defaultSlotKey);
		const buttonStyleProps = mergeSlotProps(slotProps, {
			baseClassName: [
				Button.buttonVariants({
					mode: resolvedButtonStyle.mode,
					size,
					variant: resolvedButtonStyle.variant,
				}).root(),
				baseClassName,
			],
			className: forwardedClassName,
			noStyle: contextNoStyle || noStyle,
			style: {
				...(style as CSSPropertiesWithVars<CSSVariables>),
			},
		});

		// Need to know what category to set
		if (!category && action === 'set-consent') {
			throw new Error('Category is required for set-consent action');
		}

		const buttonClick = useCallback(
			(e: MouseEvent<HTMLButtonElement>) => {
				forwardedOnClick?.(e);
				if (e.defaultPrevented) {
					return;
				}
				const actionSavesConsent =
					action === 'accept-consent' ||
					action === 'reject-consent' ||
					action === 'custom-consent';
				// Handle UI first - prioritize closing dialogs/banners
				if ((closeConsentBanner || closeConsentDialog) && !actionSavesConsent) {
					setActiveUI('none');
				}

				// Open privacy dialog if needed
				if (action === 'open-consent-dialog') {
					setActiveUI('dialog');
				}

				if (performDefaultAction && action !== 'open-consent-dialog') {
					switch (action) {
						case 'accept-consent':
							saveConsents('all');
							break;
						case 'reject-consent':
							saveConsents('none');
							break;
						case 'custom-consent':
							void saveConsents();
							break;
						case 'dismiss-notice':
							void dismissNotice();
							break;
						case 'set-consent':
							if (!category) {
								throw new Error('Category is required for set-consent action');
							}

							void saveConsents({ [category]: true });
							break;
						default:
							break;
					}
				}
			},
			[
				closeConsentBanner,
				closeConsentDialog,
				forwardedOnClick,
				saveConsents,
				setActiveUI,
				action,
				category,
				dismissNotice,
				performDefaultAction,
			]
		);

		// Buttons that open the dialog start loading its deferred module on
		// hover or focus, so the chunk downloads during the lead time before the
		// click instead of after it. While one is mounted, the module also loads
		// in idle time after the page loads, for opens with no lead time.
		//
		// These handlers replace the ones spread from `buttonStyleProps`, so they
		// call the caller's handler first: a direct prop, else the
		// `components.button.*` slot's handler.
		const opensDialog = action === 'open-consent-dialog';
		useIdleDialogWarming(opensDialog);
		const onFocus = forwardedOnFocus ?? buttonStyleProps.onFocus;
		const onPointerEnter =
			forwardedOnPointerEnter ?? buttonStyleProps.onPointerEnter;
		const buttonFocus = useCallback(
			(event: FocusEvent<HTMLButtonElement>) => {
				onFocus?.(event);
				if (opensDialog) {
					warmDialogChunk();
				}
			},
			[onFocus, opensDialog]
		);
		const buttonPointerEnter = useCallback(
			(event: PointerEvent<HTMLButtonElement>) => {
				onPointerEnter?.(event);
				if (opensDialog) {
					warmDialogChunk();
				}
			},
			[onPointerEnter, opensDialog]
		);

		const Comp = asChild ? Slot : 'button';

		// Filter out non-DOM props to prevent React warnings
		const domProps = Object.fromEntries(
			Object.entries(props).filter(
				([key]) =>
					!NON_DOM_PROPS.includes(key as (typeof NON_DOM_PROPS)[number])
			)
		);

		const isStyled = !(contextNoStyle || noStyle);

		const earlyTapOptOut = skipsEarlyTap({
			action,
			dataAction: domProps['data-action'] ?? consentAction,
			hasClickHandler: forwardedOnClick !== undefined,
			performDefaultAction,
		})
			? { [EARLY_TAP_OPT_OUT]: 'off' }
			: undefined;

		return (
			<Comp
				ref={ref}
				type={asChild ? undefined : 'button'}
				data-variant={isStyled ? resolvedButtonStyle.variant : undefined}
				data-mode={isStyled ? resolvedButtonStyle.mode : undefined}
				data-size={isStyled ? size : undefined}
				data-action={consentAction}
				{...earlyTapOptOut}
				{...buttonStyleProps}
				onClick={buttonClick}
				onFocus={buttonFocus}
				onPointerEnter={buttonPointerEnter}
				{...domProps}
			/>
		);
	}
);

ConsentButton.displayName = 'ConsentButton';
