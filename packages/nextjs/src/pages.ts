/**
 * Main entry point for the C15T Next.js integration package.
 * Re-exports all necessary components, hooks, and utilities from the React package
 * and middleware for seamless integration with Next.js applications.
 *
 * @packageDocumentation
 * @see {@link @c15t/react} for React components and hooks
 * @see {@link ./middleware} for Next.js middleware integration
 */

export { ConsentManagerProvider } from './components/consent-manager-provider/pages';
export { withInitialC15TData } from './components/consent-manager-provider/initial-data-hoc';

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
	ConsentManagerProviderProps,
	ConsentManagerDialogProps,
	ConsentManagerInterface,
	ConsentManagerWidgetProps,
	CookieBannerProps,
} from '@c15t/react';
