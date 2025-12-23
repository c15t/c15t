import {
	type ButtonVariantsProps,
	buttonVariants,
} from '@c15t/styles/primitives/button';
import type { CSSPropertiesWithVars, CSSVariables } from '@c15t/styles/types';
import type { AllConsentNames } from 'c15t';
import type { JSX } from 'preact';
import { forwardRef } from 'preact/compat';
import { useCallback } from 'preact/hooks';
import { Slot } from '~/components/shared/primitives/slot';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { ConsentButtonElement, ConsentButtonProps } from './button.types';

/**
 * Button component that allows users to reject non-essential cookies.
 *
 * @remarks
 * When clicked, this button saves only necessary cookie consents and closes the banner.
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
>(function ConsentButton(
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
) {
	const { saveConsents, setShowPopup, setIsPrivacyDialogOpen, setConsent } =
		useConsentManager();

	// Need to know what category to set
	if (!category && action === 'set-consent') {
		throw new Error('Category is required for set-consent action');
	}
	const { noStyle: contextNoStyle } = useTheme();

	const buttonStyle = useStyles(themeKey ?? 'button', {
		baseClassName: [
			!(contextNoStyle || noStyle) &&
				buttonVariants({
					variant,
					mode,
					size,
				}).root(),
		],
		style: {
			...(style as CSSPropertiesWithVars<CSSVariables>),
		},
		className: forwardedClassName?.toString(),
		noStyle: contextNoStyle || noStyle,
	});

	const buttonClick = useCallback(
		(e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
			// Close UI surfaces first
			if (closeCookieBanner) {
				setShowPopup(false);
			}
			if (closeCustomizeDialog) {
				setIsPrivacyDialogOpen(false);
			}

			// Open privacy dialog if requested
			if (action === 'open-consent-dialog') {
				setIsPrivacyDialogOpen(true);
				setShowPopup(false, true);
			}

			// User handler after UI updates
			if (forwardedOnClick) {
				forwardedOnClick(e);
			}

			// Persist consents if not just opening the dialog
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
			setConsent,
			category,
			action,
		]
	);

	return asChild ? (
		<Slot>
			<button {...buttonStyle} onClick={buttonClick} ref={ref} {...props} />
		</Slot>
	) : (
		<button {...buttonStyle} onClick={buttonClick} ref={ref} {...props} />
	);
});

ConsentButton.displayName = 'ConsentButton';
