/**
 * Main entry point for the C15T Next.js integration package.
 * Re-exports all necessary components, hooks, and utilities from the React package
 * and middleware for seamless integration with Next.js applications.
 *
 * @packageDocumentation
 * @see {@link @c15t/react} for React components and hooks
 * @see {@link ./middleware} for Next.js middleware integration
 */

// Export types
export type {
	ConsentManagerDialogProps,
	ConsentManagerInterface,
	ConsentManagerOptions,
	ConsentManagerProviderProps,
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
export { ConsentManagerProvider } from './components/consent-manager-provider';
