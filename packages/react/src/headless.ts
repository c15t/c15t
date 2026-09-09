/**
 * `@c15t/react/headless` — hooks for building your own consent UI on the
 * kernel, without the prebuilt components or their CSS.
 *
 * Pair with `ConsentProvider` from `@c15t/react` (or `@c15t/react/provider`).
 */

export {
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from '@c15t/core';
export {
	type ConsentDialogTriggerVisibility,
	type UseConsentDialogTriggerOptions,
	type UseConsentDialogTriggerResult,
	useConsentDialogTrigger,
} from './component-hooks/use-consent-dialog-trigger';
export { useConsentManager } from './component-hooks/use-consent-manager';
export {
	type HeadlessConsentBannerAction,
	type HeadlessConsentBannerState,
	type HeadlessConsentDialogAction,
	type HeadlessConsentDialogState,
	type HeadlessConsentSurface,
	type HeadlessConsentSurfaceAction,
	type HeadlessConsentSurfaceState,
	type HeadlessConsentWriteAction,
	useHeadlessConsentUI,
} from './component-hooks/use-headless-consent-ui';
export { useTranslations } from './component-hooks/use-translations';
export { useColorScheme } from './hooks/use-color-scheme';
export { useFocusTrap } from './hooks/use-focus-trap';
// IAB headless hook lives on the `@c15t/react/iab` subpath.
export type { ReactUIOptions } from './types/consent-manager';
