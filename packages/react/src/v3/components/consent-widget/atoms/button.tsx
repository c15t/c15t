import { forwardRef, type Ref } from 'react';
import { useTranslations } from '~/v3/component-hooks/use-translations';
import { ConsentButton } from '~/v3/components/shared/primitives/button';
import type { ConsentButtonProps } from '~/v3/components/shared/primitives/button.types';

/**
 * Button to accept all available cookies.
 *
 * @remarks
 * - Enables all consent options
 * - Closes dialog after action
 * - Triggers necessary callbacks
 */
const ConsentWidgetAcceptAllButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			size="small"
			action="accept-consent"
			consentAction="accept"
			{...props}
			themeKey="buttonSecondary"
			data-testid="consent-widget-footer-accept-button"
			closeConsentBanner={true}
			closeConsentDialog={true}
		>
			{children ?? common.acceptAll}
		</ConsentButton>
	);
});

const ConsentWidgetCustomizeButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="open-consent-dialog"
			consentAction="customize"
			{...props}
			themeKey="buttonSecondary"
			data-testid="consent-widget-footer-customize-button"
		>
			{children ?? common.customize}
		</ConsentButton>
	);
});

const ConsentWidgetSaveButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="custom-consent"
			consentAction="customize"
			closeConsentDialog
			{...props}
			themeKey="buttonPrimary"
			data-testid="consent-widget-footer-save-button"
		>
			{children ?? common.save}
		</ConsentButton>
	);
});

/**
 * Button to reject all non-essential cookies.
 *
 * @remarks
 * - Sets all optional consents to false
 * - Maintains required consents
 * - Closes dialog after action
 */
const ConsentWidgetRejectButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			size="small"
			action="reject-consent"
			consentAction="reject"
			{...props}
			themeKey="buttonSecondary"
			data-testid="consent-widget-reject-button"
			closeConsentBanner={true}
			closeConsentDialog={true}
		>
			{children ?? common.rejectAll}
		</ConsentButton>
	);
});

const AcceptAllButton = ConsentWidgetAcceptAllButton;
const CustomizeButton = ConsentWidgetCustomizeButton;
const SaveButton = ConsentWidgetSaveButton;
const RejectButton = ConsentWidgetRejectButton;

export {
	AcceptAllButton,
	ConsentWidgetAcceptAllButton,
	ConsentWidgetCustomizeButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
	CustomizeButton,
	RejectButton,
	SaveButton,
};
