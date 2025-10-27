// Export components with namespace support

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
export {
	ConsentManagerDialog,
	type ConsentManagerDialogProps,
} from './components/consent-manager-dialog';
export {
	ConsentManagerWidget,
	type ConsentManagerWidgetProps,
} from './components/consent-manager-widget';
export { CookieBanner } from './components/cookie-banner';
export type { CookieBannerProps } from './components/cookie-banner/cookie-banner';
export { Frame, type FrameProps } from './components/frame';
export {
	type LegalLink,
	LegalLinks,
	type LegalLinksProps,
} from './components/shared/primitives/legal-links';
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
