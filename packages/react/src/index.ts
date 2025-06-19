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
export type { ConsentManagerDialogProps } from './components/consent-manager-dialog/consent-manager-dialog';
export { ConsentManagerDialog } from './components/consent-manager-dialog/consent-manager-dialog';
export { ConsentManagerWidget } from './components/consent-manager-widget/consent-manager-widget';
export type { ConsentManagerWidgetProps } from './components/consent-manager-widget/types';
export type { CookieBannerProps } from './components/cookie-banner/cookie-banner';
export { CookieBanner } from './components/cookie-banner/cookie-banner';
export { useColorScheme } from './hooks/use-color-scheme';
// Export hooks
export { useConsentManager } from './hooks/use-consent-manager';
export { useFocusTrap } from './hooks/use-focus-trap';
export { useTranslations } from './hooks/use-translations';
export { ConsentManagerProvider } from './providers/consent-manager-provider';

// Export types
export type {
	ConsentManagerOptions,
	ConsentManagerProviderProps,
} from './types/consent-manager';
