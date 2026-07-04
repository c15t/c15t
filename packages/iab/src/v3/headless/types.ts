/**
 * Headless IAB types shared across all framework wrappers.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList, NonIABVendor } from 'c15t/v3';

export type HeadlessIABBannerAction = 'accept' | 'reject' | 'customize';
export type HeadlessIABDialogAction = 'accept' | 'reject' | 'customize';
export type HeadlessIABPreferenceTab = 'purposes' | 'vendors';
export type HeadlessIABVendorId = number | string;

/**
 * Minimal IAB state needed by the pure headless derivation helpers.
 *
 * React, Vue, Svelte, and direct kernel consumers can all pass their local
 * IAB state as long as it has this structural shape.
 */
export interface HeadlessIABStateInput {
	gvl: GlobalVendorList | null;
	isLoadingGVL?: boolean;
	nonIABVendors?: NonIABVendor[];
	customVendors?: NonIABVendor[];
}

export interface HeadlessIABBannerState {
	/** Whether the banner summary is ready to display */
	isReady: boolean;
	/** Total vendor count (GVL + custom) */
	vendorCount: number;
	/** Display items (stacks, standalone purposes, special features) */
	displayItems: string[];
	/** Count of items not shown in the display list */
	remainingCount: number;
}

export interface HeadlessIABDialogState {
	/** Whether GVL is still loading */
	isLoading: boolean;
	/** Active preference center tab */
	activeTab: HeadlessIABPreferenceTab;
}

/**
 * Processed vendor data for framework UI rendering.
 */
export interface HeadlessIABProcessedVendor {
	id: HeadlessIABVendorId;
	name: string;
	policyUrl: string;
	usesNonCookieAccess: boolean;
	deviceStorageDisclosureUrl: string | null;
	usesCookies: boolean;
	cookieMaxAgeSeconds: number | null;
	cookieRefresh?: boolean;
	specialPurposes: number[];
	specialFeatures: number[];
	features: number[];
	purposes: number[];
	legIntPurposes: number[];
	legitimateInterestUrl?: string | null;
	isCustom?: boolean;
	usesLegitimateInterest?: boolean;
	dataRetention?: {
		purposes?: Record<number, number>;
		specialPurposes?: Record<number, number>;
		stdRetention?: number;
	};
	dataDeclaration?: number[];
}

/**
 * Processed purpose data for framework UI rendering.
 */
export interface HeadlessIABProcessedPurpose {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: HeadlessIABProcessedVendor[];
	isSpecialPurpose?: boolean;
}

/**
 * Special feature data for framework UI rendering.
 */
export interface HeadlessIABProcessedSpecialFeature {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: HeadlessIABProcessedVendor[];
}

/**
 * Feature data for framework UI rendering.
 */
export interface HeadlessIABProcessedFeature {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: HeadlessIABProcessedVendor[];
}

/**
 * Stack data with resolved purposes.
 */
export interface HeadlessIABProcessedStack {
	id: number;
	name: string;
	description: string;
	purposes: HeadlessIABProcessedPurpose[];
}

/**
 * Processed GVL data ready for rendering in a consent dialog.
 */
export interface HeadlessIABDialogData {
	purposes: HeadlessIABProcessedPurpose[];
	specialPurposes: HeadlessIABProcessedPurpose[];
	specialFeatures: HeadlessIABProcessedSpecialFeature[];
	features: HeadlessIABProcessedFeature[];
	stacks: HeadlessIABProcessedStack[];
	standalonePurposes: HeadlessIABProcessedPurpose[];
	totalVendors: number;
	isLoading: boolean;
	isReady: boolean;
}
