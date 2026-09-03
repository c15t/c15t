/**
 * IAB TCF 2.3 React components and hooks.
 *
 * This subpath export contains all IAB-specific React UI. It is only
 * loaded when explicitly imported from '@c15t/react/v3/iab'.
 *
 * Requires `@c15t/iab` as a peer dependency.
 *
 * @example
 * ```tsx
 * import { ConsentProvider, hosted } from '@c15t/react/v3';
 * import { IABConsentBanner, IABConsentDialog } from '@c15t/react/v3/iab';
 *
 * <ConsentProvider
 *   options={{ mode: hosted({ url: '/api/c15t' }), iab: { cmpId: 28 } }}
 * >
 *   <IABConsentBanner />
 *   <IABConsentDialog />
 * </ConsentProvider>
 * ```
 *
 * @packageDocumentation
 */

export {
	IABConsentBanner,
	type IABConsentBannerProps,
} from './components/iab-consent-banner';
export {
	IABConsentDialog,
	type IABConsentDialogProps,
} from './components/iab-consent-dialog';
export {
	type HeadlessIABBannerAction,
	type HeadlessIABBannerState,
	type HeadlessIABDialogAction,
	type HeadlessIABDialogState,
	type HeadlessIABPreferenceTab,
	type UseHeadlessIABConsentUIResult,
	useHeadlessIABConsentUI,
} from './hooks/use-headless-iab-consent-ui';
