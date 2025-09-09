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
	ConsentManagerWidget,
	CookieBanner,
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	// Translation utilities
	prepareTranslationConfig,
	useColorScheme,
	// Export hooks
	useConsentManager,
	useFocusTrap,
	useTranslations,
} from '@c15t/react';
