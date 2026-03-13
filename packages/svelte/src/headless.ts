// Core exports (no components)
export {
	type ConsentManagerInterface,
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
// Provider (still needed for headless mode)
export { default as ConsentManagerProvider } from './components/ConsentManagerProvider.svelte';
// Context (primary API for headless usage)
export {
	type ConsentContextValue,
	getConsentContext,
	getThemeContext,
	type ThemeContextValue,
} from './context.svelte';
// IAB types and utilities (for headless/custom IAB UI)
export { getIABTranslations, type IABTranslations } from './iab-translations';
export {
	type ProcessedFeature,
	type ProcessedGVLData,
	type ProcessedPurpose,
	type ProcessedSpecialFeature,
	type ProcessedStack,
	type ProcessedVendor,
	processGVLData,
	type VendorId,
} from './iab-types';
// Types
export type { ConsentManagerOptions } from './types';
