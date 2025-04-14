import { type Ref, forwardRef } from 'react';
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
const ConsentManagerWidgetAcceptAllButton = forwardRef<
  HTMLButtonElement,
  ConsentButtonProps
>(({ children, ...props }, ref) => {
  return (
    <ConsentButton
      ref={ref as Ref<HTMLButtonElement>}
      variant="neutral"
      mode="stroke"
      size="small"
      action="accept-consent"
      {...props}
      themeKey="widget.footer.accept-button"
      data-testid="consent-manager-widget-footer-accept-button"
      closeCookieBanner={true}
      closeCustomizeDialog={true}
    >
      {children}
    </ConsentButton>
  );
});

const ConsentManagerWidgetCustomizeButton = forwardRef<
  HTMLButtonElement,
  ConsentButtonProps
>(({ children, ...props }, ref) => {
  return (
    <ConsentButton
      ref={ref as Ref<HTMLButtonElement>}
      action="open-consent-dialog"
      {...props}
      themeKey="widget.footer.customize-button"
      data-testid="consent-manager-widget-footer-customize-button"
    >
      {children}
    </ConsentButton>
  );
});

const ConsentManagerWidgetSaveButton = forwardRef<
  HTMLButtonElement,
  ConsentButtonProps
>(({ children, ...props }, ref) => {
  return (
    <ConsentButton
      ref={ref as Ref<HTMLButtonElement>}
      action="custom-consent"
      variant="primary"
      closeCustomizeDialog
      {...props}
      themeKey="widget.footer.save-button"
      data-testid="consent-manager-widget-footer-save-button"
    >
      {children}
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
  return (
    <ConsentButton
      ref={ref as Ref<HTMLButtonElement>}
      variant="neutral"
      mode="stroke"
      size="small"
      action="reject-consent"
      {...props}
      themeKey="widget.footer.reject-button"
      data-testid="consent-manager-widget-reject-button"
      closeCookieBanner={true}
      closeCustomizeDialog={true}
    >
      {children}
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
