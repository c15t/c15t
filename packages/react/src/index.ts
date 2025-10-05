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
export type { AnalyticsContextValue } from './hooks/use-analytics';
// Export analytics hooks
export {
	useAlias,
	useAnalytics,
	useAnalyticsState,
	useCommon,
	useFlush,
	useGroup,
	useIdentify,
	useIsAnalyticsLoaded,
	usePage,
	useReset,
	useTrack,
} from './hooks/use-analytics';
export { useColorScheme } from './hooks/use-color-scheme';
// Export hooks
export { useConsentManager } from './hooks/use-consent-manager';
export { useFocusTrap } from './hooks/use-focus-trap';
export { useTranslations } from './hooks/use-translations';
/**
 * @module
 * Analytics Hooks and Utilities
 *
 * @remarks
 * Exports analytics functionality integrated with consent management:
 * - Analytics hooks for tracking events (useAnalytics, useTrack, etc.)
 * - Page tracking utilities (PageTracker, usePageViews, etc.)
 * - Analytics is now integrated into ConsentManagerProvider - no separate provider needed
 *
 * @example
 * Import analytics functionality:
 * ```tsx
 * import {
 *   useAnalytics,
 *   useTrack,
 *   usePage,
 *   PageTracker
 * } from '@c15t/react';
 *
 * function App() {
 *   return (
 *     <ConsentManagerProvider options={{ analytics: { uploadUrl: '/api/analytics' } }}>
 *       <PageTracker enabled trackOnMount />
 *       <MyComponent />
 *     </ConsentManagerProvider>
 *   );
 * }
 * ```
 */
export { clearAnalyticsCache } from './providers/analytics-provider';
export { ConsentManagerProvider } from './providers/consent-manager-provider';
// Export types
export type {
	ConsentManagerOptions,
	ConsentManagerProviderProps,
} from './types/consent-manager';
export type { PageTrackerProps } from './utils/page-tracker';
// Export page tracking utilities
export {
	PageTracker,
	useNextPageViews,
	usePageViews,
	useReactRouterPageViews,
} from './utils/page-tracker';
