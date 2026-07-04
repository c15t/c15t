/**
 * Framework-agnostic headless IAB logic.
 *
 * Pure functions for IAB state derivation — no React, Svelte, or Vue.
 * Each framework package wraps these in its own reactivity system.
 *
 * @packageDocumentation
 */

// Placeholder — will be populated when extracting from useHeadlessIABConsentUI
export { resolveIABBannerSummary } from './headless/banner-summary';
export { processGVLForDialog } from './headless/dialog-data';
export type {
	HeadlessIABBannerAction,
	HeadlessIABBannerState,
	HeadlessIABDialogAction,
	HeadlessIABDialogState,
} from './headless/types';
