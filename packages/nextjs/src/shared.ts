// Shared Exports between all directories

export {
	CookieBanner,
	ConsentManagerWidget,
	ConsentManagerDialog,
	// Export hooks
	useConsentManager,
	useTranslations,
	useColorScheme,
	useFocusTrap,
	configureConsentManager,
	// Translation utilities
	prepareTranslationConfig,
	defaultTranslationConfig,
	mergeTranslationConfigs,
	detectBrowserLanguage,
} from '@c15t/react';

// Export types
export type {
	ConsentManagerOptions,
	ConsentManagerDialogProps,
	ConsentManagerInterface,
	ConsentManagerWidgetProps,
	CookieBannerProps,
} from '@c15t/react';
