import { Slot } from '@radix-ui/react-slot';
import { forwardRef, useCallback } from 'react';
import * as Button from '../ui/components/button';

import type { VariantProps } from 'tailwind-variants';
import { useStyles, useThemeContext } from '../theme';
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
		VariantProps<typeof Button.buttonVariants> & {
			action:
				| 'accept-consent'
				| 'reject-consent'
				| 'custom-consent'
				| 'open-consent-dialog';
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
			...props
		},
		ref
	) => {
		const {
			saveConsents,
			setShowPopup,
			setIsPrivacyDialogOpen,
			noStyle: contextNoStyle,
		} = useThemeContext();

		const buttonStyle = useStyles(themeKey ?? 'button', {
			baseClassName: [
				!(contextNoStyle || noStyle) &&
					Button.buttonVariants({
						variant,
						mode,
						size,
					}).root(),
			],
			style,
			className: forwardedClassName,
			noStyle: noStyle,
		});

		const buttonClick = useCallback(() => {
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
				case 'open-consent-dialog': {
					setIsPrivacyDialogOpen(true);
					setShowPopup(false, true);
					break;
				}
				default:
					break;
			}
			if (closeCookieBanner) {
				setShowPopup(false);
			}
			if (closeCustomizeDialog) {
				setIsPrivacyDialogOpen(false);
			}
			if (forwardedOnClick) {
				forwardedOnClick();
			}
		}, [
			closeCookieBanner,
			closeCustomizeDialog,
			forwardedOnClick,
			saveConsents,
			setIsPrivacyDialogOpen,
			setShowPopup,
			action,
		]);

		const Comp = asChild ? Slot : 'button';

		return <Comp ref={ref} {...buttonStyle} onClick={buttonClick} {...props} />;
	}
);

ConsentButton.displayName = 'ConsentButton';
