// Export components
export { CookieBanner } from './components/cookie-banner/cookie-banner';
export type { CookieBannerProps } from './components/cookie-banner/cookie-banner';
export { ConsentManagerWidget } from './components/consent-manager-widget/consent-manager-widget';
export type { ConsentManagerWidgetProps } from './components/consent-manager-widget/types';
export { ConsentManagerDialog } from './components/consent-manager-dialog/consent-manager-dialog';
export type { ConsentManagerDialogProps } from './components/consent-manager-dialog/consent-manager-dialog';
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
} from 'c15t';

// Export types
export type {
	ConsentManagerProviderProps,
	ConsentManagerOptions,
} from './types/consent-manager';

// Export utilities
export * from './utils/translations';
