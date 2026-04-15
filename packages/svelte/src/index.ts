export * from '@c15t/ui/primitives';
export * from '@c15t/ui/styles/primitives';

// Core exports

// Theme types
export type {
	ColorTokens,
	ComponentSlots,
	MotionTokens,
	RadiusTokens,
	ShadowTokens,
	SlotStyle,
	SpacingTokens,
	Theme,
	TypographyTokens,
} from '@c15t/ui/theme';
export type {
	AllConsentNames,
	ConsentManagerInterface,
	ConsentStoreState,
	ConsentType,
	Overrides,
	Translations,
} from 'c15t';
export {
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from 'c15t';
export { focusTrap } from './actions/focus-trap';
// Actions
export { portal } from './actions/portal';
export { scrollLock } from './actions/scroll-lock';
export { default as ConsentBanner } from './components/consent-banner.svelte';
export { default as ConsentButton } from './components/consent-button.svelte';
export { default as ConsentDialog } from './components/consent-dialog.svelte';
export { default as ConsentDialogLink } from './components/consent-dialog-link.svelte';
export { default as ConsentDialogTrigger } from './components/consent-dialog-trigger.svelte';
// Components
export { default as ConsentManagerProvider } from './components/consent-manager-provider.svelte';
export { default as ConsentWidget } from './components/consent-widget.svelte';
export { default as Frame } from './components/frame.svelte';
// IAB TCF 2.3 Components
export { default as IABConsentBanner } from './components/iab-consent-banner.svelte';
export { default as IABConsentDialog } from './components/iab-consent-dialog.svelte';
// Context
export {
	type ConsentContextValue,
	type ConsentTrackingValue,
	getConsentContext,
	getConsentManager,
	getThemeContext,
	getTrackingContext,
	type ThemeContextValue,
} from './context.svelte';
// Types
export type { ConsentManagerOptions } from './types';
