/**
 * Framework-agnostic headless IAB logic.
 *
 * Pure functions for IAB state derivation — no React, Svelte, or Vue.
 * Each framework package wraps these in its own reactivity system.
 *
 * @packageDocumentation
 */

export { resolveIABBannerSummary } from './headless/banner-summary';
export {
	type ProcessedFeature,
	type ProcessedGVLData,
	type ProcessedPurpose,
	type ProcessedSpecialFeature,
	type ProcessedStack,
	type ProcessedVendor,
	processGVLForDialog,
} from './headless/dialog-data';
export type {
	HeadlessIABBannerAction,
	HeadlessIABBannerState,
	HeadlessIABDialogAction,
	HeadlessIABDialogData,
	HeadlessIABDialogState,
	HeadlessIABPreferenceTab,
	HeadlessIABProcessedFeature,
	HeadlessIABProcessedPurpose,
	HeadlessIABProcessedSpecialFeature,
	HeadlessIABProcessedStack,
	HeadlessIABProcessedVendor,
	HeadlessIABStateInput,
	HeadlessIABVendorId,
} from './headless/types';
