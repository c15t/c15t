export type { AllConsentNames } from 'c15t';
export type { ConsentState, KernelActiveUI, KernelConfig } from 'c15t/v3';
export { focusTrap } from './actions/focus-trap';
export { portal } from './actions/portal';
export { scrollLock } from './actions/scroll-lock';
export { default as InlineLegalLinks } from './components/inline-legal-links.svelte';
export {
	getConsentKernel,
	getConsentManager,
	getHeadlessConsent,
	getIAB,
	getSnapshot,
	type HeadlessConsentSurfaceState,
	type SvelteIABState,
} from './context.svelte';
export { getIABTranslations, type IABTranslations } from './iab-translations';
export {
	getIABBannerDisplayItems,
	type ProcessedFeature,
	type ProcessedGVLData,
	type ProcessedPurpose,
	type ProcessedSpecialFeature,
	type ProcessedStack,
	type ProcessedVendor,
	processGVLData,
	type VendorId,
} from './iab-types';
export type { ConsentProviderOptions } from './types';
