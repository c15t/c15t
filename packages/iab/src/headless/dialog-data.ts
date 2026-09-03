/**
 * Framework-agnostic IAB dialog data processing.
 *
 * Processes GVL data into UI-ready structures for the consent dialog.
 * This keeps the O(purposes x vendors) derivation out of framework
 * components and makes the same result consumable by React, Vue, Svelte,
 * Solid, and Astro wrappers.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList, NonIABVendor } from '@c15t/core';

import type {
	HeadlessIABDialogData,
	HeadlessIABProcessedFeature,
	HeadlessIABProcessedPurpose,
	HeadlessIABProcessedSpecialFeature,
	HeadlessIABProcessedStack,
	HeadlessIABProcessedVendor,
	HeadlessIABStateInput,
} from './types';

const STANDALONE_PURPOSE_ID = 1;

const EMPTY_DIALOG_DATA: HeadlessIABDialogData = {
	features: [],
	isLoading: true,
	isReady: false,
	purposes: [],
	specialFeatures: [],
	specialPurposes: [],
	stacks: [],
	standalonePurposes: [],
	totalVendors: 0,
};

type GvlVendor = GlobalVendorList['vendors'][number];

const getCustomVendors = function getCustomVendors(
	iab: HeadlessIABStateInput
): NonIABVendor[] {
	return iab.nonIABVendors ?? iab.customVendors ?? [];
};

const mapGvlVendor = function mapGvlVendor(
	vendorId: string,
	vendor: GvlVendor,
	purposeId?: number
): HeadlessIABProcessedVendor {
	return {
		cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
		cookieRefresh: vendor.cookieRefresh,
		dataRetention: vendor.dataRetention,
		deviceStorageDisclosureUrl: vendor.deviceStorageDisclosureUrl ?? null,
		features: vendor.features || [],
		id: Number(vendorId),
		isCustom: false,
		legIntPurposes: vendor.legIntPurposes || [],
		legitimateInterestUrl:
			vendor.urls?.find((url) => url.legIntClaim)?.legIntClaim ?? null,
		name: vendor.name,
		policyUrl: (vendor as unknown as { policyUrl?: string }).policyUrl ?? '',
		purposes: vendor.purposes || [],
		specialFeatures: vendor.specialFeatures || [],
		specialPurposes: vendor.specialPurposes || [],
		usesCookies: vendor.usesCookies,
		usesLegitimateInterest: purposeId
			? (vendor.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		usesNonCookieAccess: vendor.usesNonCookieAccess,
	};
};

const mapCustomVendor = function mapCustomVendor(
	vendor: NonIABVendor,
	purposeId?: number
): HeadlessIABProcessedVendor {
	return {
		cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds ?? null,
		cookieRefresh: undefined,
		dataRetention: undefined,
		deviceStorageDisclosureUrl: null,
		features: vendor.features || [],
		id: vendor.id,
		isCustom: true,
		legIntPurposes: vendor.legIntPurposes || [],
		legitimateInterestUrl: null,
		name: vendor.name,
		policyUrl: vendor.privacyPolicyUrl,
		purposes: vendor.purposes || [],
		specialFeatures: vendor.specialFeatures || [],
		specialPurposes: [],
		usesCookies: vendor.usesCookies ?? false,
		usesLegitimateInterest: purposeId
			? (vendor.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		usesNonCookieAccess: vendor.usesNonCookieAccess ?? false,
	};
};

const processPurposes = function processPurposes(
	gvl: GlobalVendorList,
	customVendors: NonIABVendor[]
): HeadlessIABProcessedPurpose[] {
	return Object.entries(gvl.purposes)
		.map(([id, purpose]) => {
			const purposeId = Number(id);
			const iabVendorsForPurpose = Object.entries(gvl.vendors)
				.filter(
					([, vendor]) =>
						vendor.purposes?.includes(purposeId) ||
						vendor.legIntPurposes?.includes(purposeId)
				)
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor, purposeId));

			const customVendorsForPurpose = customVendors
				.filter(
					(vendor) =>
						vendor.purposes?.includes(purposeId) ||
						vendor.legIntPurposes?.includes(purposeId)
				)
				.map((vendor) => mapCustomVendor(vendor, purposeId));

			return {
				description: purpose.description,
				descriptionLegal: purpose.descriptionLegal,
				id: purposeId,
				illustrations: purpose.illustrations || [],
				name: purpose.name,
				vendors: [...iabVendorsForPurpose, ...customVendorsForPurpose],
			};
		})
		.filter((purpose) => purpose.vendors.length > 0);
};

const processSpecialPurposes = function processSpecialPurposes(
	gvl: GlobalVendorList
): HeadlessIABProcessedPurpose[] {
	return Object.entries(gvl.specialPurposes || {})
		.map(([id, purpose]) => {
			const purposeId = Number(id);
			const vendorsForPurpose = Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.specialPurposes?.includes(purposeId))
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor));

			return {
				description: purpose.description,
				descriptionLegal: purpose.descriptionLegal,
				id: purposeId,
				illustrations: purpose.illustrations || [],
				isSpecialPurpose: true,
				name: purpose.name,
				vendors: vendorsForPurpose,
			};
		})
		.filter((purpose) => purpose.vendors.length > 0);
};

const processSpecialFeatures = function processSpecialFeatures(
	gvl: GlobalVendorList
): HeadlessIABProcessedSpecialFeature[] {
	return Object.entries(gvl.specialFeatures || {})
		.map(([id, feature]) => {
			const featureId = Number(id);
			const vendorsForFeature = Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.specialFeatures?.includes(featureId))
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor));

			return {
				description: feature.description,
				descriptionLegal: feature.descriptionLegal,
				id: featureId,
				illustrations: feature.illustrations || [],
				name: feature.name,
				vendors: vendorsForFeature,
			};
		})
		.filter((feature) => feature.vendors.length > 0);
};

const processFeatures = function processFeatures(
	gvl: GlobalVendorList
): HeadlessIABProcessedFeature[] {
	return Object.entries(gvl.features || {})
		.map(([id, feature]) => {
			const featureId = Number(id);
			const vendorsForFeature = Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.features?.includes(featureId))
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor));

			return {
				description: feature.description,
				descriptionLegal: feature.descriptionLegal,
				id: featureId,
				illustrations: feature.illustrations || [],
				name: feature.name,
				vendors: vendorsForFeature,
			};
		})
		.filter((feature) => feature.vendors.length > 0);
};

const groupPurposesIntoStacks = function groupPurposesIntoStacks(
	gvl: GlobalVendorList,
	purposes: HeadlessIABProcessedPurpose[]
): Pick<HeadlessIABDialogData, 'stacks' | 'standalonePurposes'> {
	const standalonePurpose = purposes.find(
		(purpose) => purpose.id === STANDALONE_PURPOSE_ID
	);
	const otherPurposes = purposes.filter(
		(purpose) => purpose.id !== STANDALONE_PURPOSE_ID
	);
	const otherPurposeIds = new Set(otherPurposes.map((purpose) => purpose.id));
	const gvlStacks = gvl.stacks || {};

	const stackScores: {
		stackId: number;
		stack: (typeof gvlStacks)[number];
		coveredPurposeIds: number[];
		score: number;
	}[] = [];

	for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
		const coveredPurposeIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredPurposeIds.length >= 2) {
			stackScores.push({
				coveredPurposeIds,
				score: coveredPurposeIds.length,
				stack,
				stackId: Number(stackIdStr),
			});
		}
	}

	stackScores.sort((a, b) => b.score - a.score);

	const stacks: HeadlessIABProcessedStack[] = [];
	const assignedPurposeIds = new Set<number>();
	for (const { stackId, stack, coveredPurposeIds } of stackScores) {
		const unassignedPurposeIds = coveredPurposeIds.filter(
			(purposeId) => !assignedPurposeIds.has(purposeId)
		);
		if (unassignedPurposeIds.length >= 2) {
			const stackPurposes = otherPurposes.filter((purpose) =>
				unassignedPurposeIds.includes(purpose.id)
			);
			stacks.push({
				description: stack.description,
				id: stackId,
				name: stack.name,
				purposes: stackPurposes,
			});
			for (const purposeId of unassignedPurposeIds) {
				assignedPurposeIds.add(purposeId);
			}
		}
	}

	const uncoveredPurposes = otherPurposes.filter(
		(purpose) => !assignedPurposeIds.has(purpose.id)
	);
	const standalonePurposes = standalonePurpose
		? [standalonePurpose, ...uncoveredPurposes]
		: uncoveredPurposes;

	return { stacks, standalonePurposes };
};

/**
 * Processes GVL data into a format suitable for the consent dialog UI.
 *
 * @param iab - IAB state with GVL and optional custom vendors
 * @returns Processed GVL data for rendering
 */
export const processGVLForDialog = function processGVLForDialog(
	iab: HeadlessIABStateInput | null
): HeadlessIABDialogData {
	if (!iab?.gvl) {
		return {
			...EMPTY_DIALOG_DATA,
			isLoading: Boolean(iab?.isLoadingGVL ?? true),
		};
	}

	const { gvl } = iab;
	const customVendors = getCustomVendors(iab);
	const purposes = processPurposes(gvl, customVendors);
	const specialPurposes = processSpecialPurposes(gvl);
	const specialFeatures = processSpecialFeatures(gvl);
	const features = processFeatures(gvl);
	const { stacks, standalonePurposes } = groupPurposesIntoStacks(gvl, purposes);

	return {
		features,
		isLoading: Boolean(iab.isLoadingGVL || !iab.gvl),
		isReady: true,
		purposes,
		specialFeatures,
		specialPurposes,
		stacks,
		standalonePurposes,
		totalVendors: Object.keys(gvl.vendors).length + customVendors.length,
	};
};

export type {
	HeadlessIABDialogData as ProcessedGVLData,
	HeadlessIABProcessedFeature as ProcessedFeature,
	HeadlessIABProcessedPurpose as ProcessedPurpose,
	HeadlessIABProcessedSpecialFeature as ProcessedSpecialFeature,
	HeadlessIABProcessedStack as ProcessedStack,
	HeadlessIABProcessedVendor as ProcessedVendor,
};
