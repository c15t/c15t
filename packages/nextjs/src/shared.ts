// Shared Exports between all directories

// Export types
export type {
	ConsentManagerDialogProps,
	ConsentManagerInterface,
	ConsentManagerOptions,
	ConsentManagerWidgetProps,
	CookieBannerProps,
} from '@c15t/react';

export {
	ConsentManagerDialog,
	ConsentManagerProvider as ClientConsentManagerProvider,
	ConsentManagerWidget,
	CookieBanner,
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	Frame,
	mergeTranslationConfigs,
	// Translation utilities
	prepareTranslationConfig,
	useColorScheme,
	// Export hooks
	useConsentManager,
	useFocusTrap,
	useTranslations,
} from '@c15t/react';
