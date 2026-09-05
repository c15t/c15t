/**
 * The Svelte adapter's view of the shared IAB display model.
 *
 * The derivation itself — which purposes a stack absorbs, which rows a
 * preference centre lists, what each row's test-id is — lives in
 * `@c15t/iab/headless` so React, Svelte, Vue and the Astro server render
 * cannot drift apart. This module is the thin naming layer that was left
 * behind: the local type aliases the components already import, and two
 * wrappers keeping the argument shapes they already call with.
 *
 * `@c15t/iab/headless` is pure derivation with no TCF encoder behind it,
 * so importing it here does not pull the CMP API into an app that never
 * mounts an IAB surface — the components that import this module are
 * themselves only reachable from `<IABConsentBanner>`/`<IABConsentDialog>`.
 */

import type { GlobalVendorList } from '@c15t/core';
import {
	processGVLForDialog,
	resolveIABBannerSummary,
} from '@c15t/iab/headless';
import type {
	HeadlessIABDialogData,
	HeadlessIABProcessedFeature,
	HeadlessIABProcessedPurpose,
	HeadlessIABProcessedSpecialFeature,
	HeadlessIABProcessedStack,
	HeadlessIABProcessedVendor,
	HeadlessIABVendorId,
} from '@c15t/iab/headless';

export type VendorId = HeadlessIABVendorId;
export type ProcessedVendor = HeadlessIABProcessedVendor;
export type ProcessedPurpose = HeadlessIABProcessedPurpose;
export type ProcessedSpecialFeature = HeadlessIABProcessedSpecialFeature;
export type ProcessedFeature = HeadlessIABProcessedFeature;
export type ProcessedStack = HeadlessIABProcessedStack;

export type {
	HeadlessIABDialogDisplayModel as IABDisplayModel,
	HeadlessIABDisplayConsentRow as IABDisplayConsentRow,
	HeadlessIABDisplayRow as IABDisplayRow,
	HeadlessIABDisplayStackRow as IABDisplayStackRow,
} from '@c15t/iab/headless';
export { resolveIABDialogDisplayModel } from '@c15t/iab/headless';

/** Custom vendor not registered with IAB. */
export interface NonIABVendor {
	id: string | number;
	name: string;
	privacyPolicyUrl: string;
	purposes: number[];
	legIntPurposes?: number[];
	specialFeatures?: number[];
	features?: number[];
	dataCategories?: number[];
	usesCookies?: boolean;
	usesNonCookieAccess?: boolean;
	cookieMaxAgeSeconds?: number;
}

/** Result of processing GVL data into UI-friendly format. */
export type ProcessedGVLData = HeadlessIABDialogData;

/**
 * Process raw GVL data into UI-friendly format.
 *
 * @param gvl - The Global Vendor List.
 * @param customVendors - Publisher-declared non-IAB vendors.
 * @returns The processed purposes, stacks, features and vendors.
 */
export const processGVLData = function processGVLData(
	gvl: GlobalVendorList,
	customVendors: NonIABVendor[] = []
): ProcessedGVLData {
	return processGVLForDialog({ customVendors, gvl });
};

/**
 * Compute display items for the IAB consent banner.
 *
 * @param gvl - The Global Vendor List.
 * @param maxItems - Ignored; the shared model owns the cap so the four
 * banners list the same number of items. Kept so existing call sites
 * compile.
 * @returns The item names to list, and how many were left out.
 */
export const getIABBannerDisplayItems = function getIABBannerDisplayItems(
	gvl: GlobalVendorList,
	maxItems?: number
): { displayed: string[]; remainingCount: number } {
	void maxItems;
	const summary = resolveIABBannerSummary({ gvl });
	return {
		displayed: summary.displayItems,
		remainingCount: summary.remainingCount,
	};
};
