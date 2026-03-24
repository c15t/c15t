import { Slot } from '@radix-ui/react-slot';
import type { AllConsentNames } from 'c15t';
import { forwardRef, type MouseEvent, useCallback } from 'react';
import { useConsentTracking } from '~/context/consent-tracking-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type {
	AllThemeKeys,
	CSSPropertiesWithVars,
	CSSVariables,
} from '~/types/theme';
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
] as const;

type ConsentActionThemeKey = 'accept' | 'reject' | 'customize';

function resolveConsentButtonStyle(params: {
	consentAction?: ConsentActionThemeKey;
	isPrimary?: boolean;
	theme?: ReturnType<typeof useTheme>['theme'];
	variant?: ButtonVariantsProps['variant'];
	mode?: ButtonVariantsProps['mode'];
}) {
	if (params.variant || params.mode) {
		return {
			variant: params.variant ?? 'neutral',
			mode: params.mode ?? 'stroke',
		};
	}

	const defaultStyle = params.isPrimary
		? { variant: 'primary' as const, mode: 'stroke' as const }
		: { variant: 'neutral' as const, mode: 'stroke' as const };
	const themedDefault = params.theme?.consentActions?.default ?? {};
	const themedAction = params.consentAction
		? params.theme?.consentActions?.[params.consentAction]
		: undefined;

	return {
		variant:
			themedAction?.variant ?? themedDefault.variant ?? defaultStyle.variant,
		mode: themedAction?.mode ?? themedDefault.mode ?? defaultStyle.mode,
	};
}

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
export const ConsentButton = forwardRef<
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
				| 'set-consent';
			category?: AllConsentNames;
			closeConsentDialog?: boolean;
			closeConsentBanner?: boolean;
		}
>(
	(
		{
			asChild,
			className: forwardedClassName,
			style,
			noStyle,
			action,
			themeKey,
			baseClassName,
			variant,
			mode,
			size = 'small',
			consentAction,
			isPrimary,
			onClick: forwardedOnClick,
			closeConsentBanner = false,
			closeConsentDialog = false,
			category,
			...props
		},
		ref
	) => {
		const { saveConsents, setActiveUI, setConsent } = useConsentManager();
		const { uiSource } = useConsentTracking();
		const { noStyle: contextNoStyle, theme } = useTheme();
		const resolvedButtonStyle = resolveConsentButtonStyle({
			consentAction,
			isPrimary,
			theme,
			variant,
			mode,
		});

		const defaultThemeKey =
			resolvedButtonStyle.variant === 'primary'
				? 'buttonPrimary'
				: 'buttonSecondary';

		const buttonStyle = useStyles(
			(themeKey as AllThemeKeys) ?? defaultThemeKey,
			{
				baseClassName: [
					!(contextNoStyle || noStyle) &&
						Button.buttonVariants({
							variant: resolvedButtonStyle.variant,
							mode: resolvedButtonStyle.mode,
							size,
						}).root(),
				],
				style: {
					...(style as CSSPropertiesWithVars<CSSVariables>),
				},
				className: forwardedClassName,
				noStyle: contextNoStyle || noStyle,
			}
		);
		const { noStyle: _resolvedNoStyle, ...buttonStyleProps } = buttonStyle;

		// Need to know what category to set
		if (!category && action === 'set-consent') {
			throw new Error('Category is required for set-consent action');
		}

		const buttonClick = useCallback(
			(e: MouseEvent<HTMLButtonElement>) => {
				// Handle UI first - prioritize closing dialogs/banners
				if (closeConsentBanner || closeConsentDialog) {
					setActiveUI('none');
				}

				// Open privacy dialog if needed
				if (action === 'open-consent-dialog') {
					setActiveUI('dialog');
				}

				// Call the user's onClick handler after UI updates
				if (forwardedOnClick) {
					forwardedOnClick(e);
				}

				if (action !== 'open-consent-dialog') {
					const consentOptions = uiSource ? { uiSource } : undefined;
					switch (action) {
						case 'accept-consent':
							saveConsents('all', consentOptions);
							break;
						case 'reject-consent':
							saveConsents('necessary', consentOptions);
							break;
						case 'custom-consent':
							saveConsents('custom', consentOptions);
							break;
						case 'set-consent':
							if (!category) {
								throw new Error('Category is required for set-consent action');
							}

							setConsent(category, true);
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
				setConsent,
				uiSource,
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

		return (
			<Comp
				ref={ref}
				{...buttonStyleProps}
				onClick={buttonClick}
				{...domProps}
			/>
		);
	}
);

ConsentButton.displayName = 'ConsentButton';
