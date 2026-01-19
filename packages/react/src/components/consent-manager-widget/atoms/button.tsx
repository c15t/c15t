import { forwardRef, type Ref } from 'react';
import { ConsentButton } from '~/components/shared/primitives/button';
import type { ConsentButtonProps } from '~/components/shared/primitives/button.types';
import { useTranslations } from '~/hooks/use-translations';

/**
 * Button to accept all available cookies.
 *
 * @remarks
 * - Enables all consent options
 * - Closes dialog after action
 * - Triggers necessary callbacks
 */
const ConsentManagerWidgetAcceptAllButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			mode="stroke"
			size="small"
			action="accept-consent"
			{...props}
			themeKey="buttonSecondary"
			data-testid="consent-manager-widget-footer-accept-button"
			closeCookieBanner={true}
			closeCustomizeDialog={true}
		>
			{children ?? common.acceptAll}
		</ConsentButton>
	);
});

const ConsentManagerWidgetCustomizeButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="open-consent-dialog"
			{...props}
			themeKey="buttonSecondary"
			data-testid="consent-manager-widget-footer-customize-button"
		>
			{children ?? common.customize}
		</ConsentButton>
	);
});

const ConsentManagerWidgetSaveButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="custom-consent"
			primary
			closeCustomizeDialog
			{...props}
			themeKey="buttonPrimary"
			data-testid="consent-manager-widget-footer-save-button"
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
const ConsentManagerWidgetRejectButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			mode="stroke"
			size="small"
			action="reject-consent"
			{...props}
			themeKey="buttonSecondary"
			data-testid="consent-manager-widget-reject-button"
			closeCookieBanner={true}
			closeCustomizeDialog={true}
		>
			{children ?? common.rejectAll}
		</ConsentButton>
	);
});

const AcceptAllButton = ConsentManagerWidgetAcceptAllButton;
const CustomizeButton = ConsentManagerWidgetCustomizeButton;
const SaveButton = ConsentManagerWidgetSaveButton;
const RejectButton = ConsentManagerWidgetRejectButton;

export {
	AcceptAllButton,
	CustomizeButton,
	SaveButton,
	RejectButton,
	ConsentManagerWidgetAcceptAllButton,
	ConsentManagerWidgetCustomizeButton,
	ConsentManagerWidgetSaveButton,
	ConsentManagerWidgetRejectButton,
};
