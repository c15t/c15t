/**
 * @c15t/conformance — Shared interaction tests for cross-framework verification.
 *
 * Play functions are framework-agnostic: they interact with the DOM via
 * `userEvent`, `within`, `expect`, and standard ARIA roles / data-testid attributes.
 * Each framework's storybook provides the render; this package provides the test logic.
 *
 * ## DOM Contract
 *
 * ### Primitives (queried by ARIA role / data-state)
 *
 * - Accordion: `button` triggers, `data-state="open|closed"` on items/content
 * - Button: `<button>` element, `type="button"`, `disabled` attribute
 * - Collapsible: `button` trigger, `data-state="open|closed"` on content
 * - Dialog: `role="dialog"`, `aria-labelledby`, focus trap, ESC to close
 * - Switch: `role="switch"`, `aria-checked`, `data-state="checked|unchecked"`
 * - Tabs: `role="tablist"`, `role="tab"` with `aria-selected`, `role="tabpanel"`
 * - PreferenceItem: `button` trigger, `data-state="open|closed"` on content
 *
 * ### Consent Components (queried by data-testid)
 *
 * - consent-banner-root, consent-banner-customize-button,
 *   consent-banner-accept-button, consent-banner-reject-button
 * - consent-dialog-root, consent-dialog-title
 * - consent-widget-root, consent-widget-footer-save-button,
 *   consent-widget-accordion-trigger-{name}, consent-widget-accordion-content-{name},
 *   consent-widget-switch-{name}
 * - iab-consent-banner-customize-button, iab-consent-dialog-root
 */

export * from './a11y';
export * from './computed-style';
export * from './contract';
export * from './dom-snapshot';
export * from './driver';
export {
	editableConsentOptions,
	editableStoredConsent,
} from './fixtures/index';
export * from './suite';
