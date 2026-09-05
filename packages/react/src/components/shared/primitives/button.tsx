import type { AllConsentNames } from '@c15t/core';
import { forwardRef as createForwardRef, useCallback } from 'react';
import type { MouseEvent } from 'react';

import { useConsentDraft } from '~/draft';
import { useSaveConsents, useSetActiveUI, useDismissNotice } from '~/hooks';
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
 * 3. `theme.consentActions.default`
 * 4. Hardcoded fallback based on `isPrimary`
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

	const defaultStyle = params.isPrimary
		? { mode: 'stroke' as const, variant: 'primary' as const }
		: { mode: 'stroke' as const, variant: 'neutral' as const };
	const themedDefault = params.theme?.consentActions?.default ?? {};
	const themedAction =
		params.consentAction &&
		params.consentAction !== 'dismiss' &&
		params.consentAction !== 'save'
			? params.theme?.consentActions?.[params.consentAction]
			: undefined;

	return {
		mode: themedAction?.mode ?? themedDefault.mode ?? defaultStyle.mode,
		variant:
			themedAction?.variant ?? themedDefault.variant ?? defaultStyle.variant,
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
			closeConsentBanner = false,
			closeConsentDialog = false,
			performDefaultAction = true,
			category,
			...props
		},
		ref
	) => {
		const saveConsents = useSaveConsents();
		const setActiveUI = useSetActiveUI();
		const { save: saveDraft } = useConsentDraft();
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
							void saveDraft();
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
				saveDraft,
				dismissNotice,
				performDefaultAction,
			]
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

		return (
			<Comp
				ref={ref}
				type={asChild ? undefined : 'button'}
				data-variant={isStyled ? resolvedButtonStyle.variant : undefined}
				data-mode={isStyled ? resolvedButtonStyle.mode : undefined}
				data-size={isStyled ? size : undefined}
				data-action={consentAction}
				{...buttonStyleProps}
				onClick={buttonClick}
				{...domProps}
			/>
		);
	}
);

ConsentButton.displayName = 'ConsentButton';
