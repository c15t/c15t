// Export components

// Export client
export {
	type ConsentManagerInterface,
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	// Translation utilities
	prepareTranslationConfig,
} from 'c15t';
export { useColorScheme } from './hooks/use-color-scheme';
export {
	type ConsentDialogTriggerVisibility,
	type UseConsentDialogTriggerOptions,
	type UseConsentDialogTriggerResult,
	useConsentDialogTrigger,
} from './hooks/use-consent-dialog-trigger';
// Export hooks
export { useConsentManager } from './hooks/use-consent-manager';
export { useFocusTrap } from './hooks/use-focus-trap';
export {
	type HeadlessConsentSurface,
	type HeadlessConsentSurfaceState,
	type UseHeadlessConsentUIResult,
	useHeadlessConsentUI,
} from './hooks/use-headless-consent-ui';
export {
	type HeadlessIABBannerAction,
	type HeadlessIABBannerState,
	type HeadlessIABDialogAction,
	type HeadlessIABDialogState,
	type HeadlessIABPreferenceTab,
	type UseHeadlessIABConsentUIResult,
	useHeadlessIABConsentUI,
} from './hooks/use-headless-iab-consent-ui';
export { useTranslations } from './hooks/use-translations';
export { ConsentManagerProvider } from './providers/consent-manager-provider';

// Export types
export type {
	ConsentManagerOptions,
	ConsentManagerProviderProps,
} from './types/consent-manager';
