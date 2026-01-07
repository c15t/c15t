import type { CSSPropertiesWithVars, CSSVariables } from '@c15t/styles/types';
import { Slot } from '@radix-ui/react-slot';
import type { AllConsentNames } from 'c15t';
import { forwardRef, type MouseEvent, useCallback } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import * as Button from '../ui/button';
import type { ButtonVariantsProps } from '../ui/button/button';
import type { ConsentButtonElement, ConsentButtonProps } from './button.types';

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
			action:
				| 'accept-consent'
				| 'reject-consent'
				| 'custom-consent'
				| 'open-consent-dialog'
				| 'set-consent';
			category?: AllConsentNames;
			closeCustomizeDialog?: boolean;
			closeCookieBanner?: boolean;
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
			variant = 'neutral',
			mode = 'stroke',
			size = 'small',
			onClick: forwardedOnClick,
			closeCookieBanner = false,
			closeCustomizeDialog = false,
			category,
			...props
		},
		ref
	) => {
		const { saveConsents, setShowPopup, setIsPrivacyDialogOpen, setConsent } =
			useConsentManager();
		const { noStyle: contextNoStyle } = useTheme();

		const buttonStyle = useStyles(themeKey ?? 'button', {
			baseClassName: [
				!(contextNoStyle || noStyle) &&
					Button.buttonVariants({
						variant,
						mode,
						size,
					}).root(),
			],
			style: {
				...(style as CSSPropertiesWithVars<CSSVariables>),
			},
			className: forwardedClassName,
			noStyle: contextNoStyle || noStyle,
		});

		// Need to know what category to set
		if (!category && action === 'set-consent') {
			throw new Error('Category is required for set-consent action');
		}

		const buttonClick = useCallback(
			(e: MouseEvent<HTMLButtonElement>) => {
				// Handle UI first - prioritize closing dialogs
				if (closeCookieBanner) {
					setShowPopup(false);
				}

				if (closeCustomizeDialog) {
					setIsPrivacyDialogOpen(false);
				}

				// Open privacy dialog if needed
				if (action === 'open-consent-dialog') {
					setIsPrivacyDialogOpen(true);
					setShowPopup(false, true);
				}

				// Call the user's onClick handler after UI updates
				if (forwardedOnClick) {
					forwardedOnClick(e);
				}

				if (action !== 'open-consent-dialog') {
					switch (action) {
						case 'accept-consent':
							saveConsents('all');
							break;
						case 'reject-consent':
							saveConsents('necessary');
							break;
						case 'custom-consent':
							saveConsents('custom');
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
				closeCookieBanner,
				closeCustomizeDialog,
				forwardedOnClick,
				saveConsents,
				setIsPrivacyDialogOpen,
				setShowPopup,
				action,
			]
		);

		const Comp = asChild ? Slot : 'button';

		return <Comp ref={ref} {...buttonStyle} onClick={buttonClick} {...props} />;
	}
);

ConsentButton.displayName = 'ConsentButton';
