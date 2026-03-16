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
export { default as ConsentBanner } from './components/ConsentBanner.svelte';
export { default as ConsentButton } from './components/ConsentButton.svelte';
export { default as ConsentDialog } from './components/ConsentDialog.svelte';
export {
	default as ConsentDialogLink,
	default as ConsentPreferencesLink,
} from './components/ConsentDialogLink.svelte';
export { default as ConsentDialogTrigger } from './components/ConsentDialogTrigger.svelte';
// Components
export { default as ConsentManagerProvider } from './components/ConsentManagerProvider.svelte';
export { default as ConsentWidget } from './components/ConsentWidget.svelte';
export { default as Frame } from './components/Frame.svelte';
// IAB TCF 2.3 Components
export { default as IABConsentBanner } from './components/IABConsentBanner.svelte';
export { default as IABConsentDialog } from './components/IABConsentDialog.svelte';
// Context
export {
	type ConsentContextValue,
	type ConsentTrackingValue,
	getConsentContext,
	getThemeContext,
	getTrackingContext,
	type ThemeContextValue,
} from './context.svelte';
// Types
export type { ConsentManagerOptions } from './types';
