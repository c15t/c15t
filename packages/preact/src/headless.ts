// Export components
export { ConsentManagerProvider } from './providers/consent-manager-provider';

// Export hooks
export { useConsentManager } from './hooks/use-consent-manager';
export { useTranslations } from './hooks/use-translations';
export { useColorScheme } from './hooks/use-color-scheme';
export { useFocusTrap } from './hooks/use-focus-trap';

// Export client
export {
	configureConsentManager,
	type ConsentManagerInterface,
	// Translation utilities
	prepareTranslationConfig,
	defaultTranslationConfig,
	mergeTranslationConfigs,
	detectBrowserLanguage,
} from 'c15t';

// Export types
export type {
	ConsentManagerProviderProps,
	ConsentManagerOptions,
} from './types/consent-manager';
