import { forwardRef as createForwardRef } from 'react';
import type { Ref } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { ConsentButton } from '~/components/shared/primitives/button';
import type { ConsentButtonProps } from '~/components/shared/primitives/button.types';

/**
 * Button to accept all available cookies.
 *
 * @remarks
 * - Enables all consent options
 * - Closes dialog after action
 * - Triggers necessary callbacks
 */
const ConsentWidgetAcceptAllButton = createForwardRef<
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
			slotKey="button.secondary"
			data-testid="consent-widget-footer-accept-all-button"
			closeConsentBanner={true}
			closeConsentDialog={true}
		>
			{children ?? common.acceptAll}
		</ConsentButton>
	);
});
ConsentWidgetAcceptAllButton.displayName = 'ConsentWidgetAcceptAllButton';

const ConsentWidgetCustomizeButton = createForwardRef<
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
			slotKey="button.secondary"
			data-testid="consent-widget-footer-customize-button"
		>
			{children ?? common.customize}
		</ConsentButton>
	);
});
ConsentWidgetCustomizeButton.displayName = 'ConsentWidgetCustomizeButton';

const ConsentWidgetSaveButton = createForwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="custom-consent"
			consentAction="save"
			closeConsentDialog
			{...props}
			slotKey="button.primary"
			data-testid="consent-widget-footer-save-button"
		>
			{children ?? common.save}
		</ConsentButton>
	);
});
ConsentWidgetSaveButton.displayName = 'ConsentWidgetSaveButton';

/**
 * Button to reject all non-essential cookies.
 *
 * @remarks
 * - Sets all optional consents to false
 * - Maintains required consents
 * - Closes dialog after action
 */
const ConsentWidgetRejectButton = createForwardRef<
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
			slotKey="button.secondary"
			data-testid="consent-widget-reject-button"
			closeConsentBanner={true}
			closeConsentDialog={true}
		>
			{children ?? common.rejectAll}
		</ConsentButton>
	);
});
ConsentWidgetRejectButton.displayName = 'ConsentWidgetRejectButton';

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
