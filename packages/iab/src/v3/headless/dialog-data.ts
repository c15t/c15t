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

import type { GlobalVendorList, NonIABVendor } from 'c15t/v3';
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
	purposes: [],
	specialPurposes: [],
	specialFeatures: [],
	features: [],
	stacks: [],
	standalonePurposes: [],
	totalVendors: 0,
	isLoading: true,
	isReady: false,
};

type GvlVendor = GlobalVendorList['vendors'][number];

function getCustomVendors(iab: HeadlessIABStateInput): NonIABVendor[] {
	return iab.nonIABVendors ?? iab.customVendors ?? [];
}

function mapGvlVendor(
	vendorId: string,
	vendor: GvlVendor,
	purposeId?: number
): HeadlessIABProcessedVendor {
	return {
		id: Number(vendorId),
		name: vendor.name,
		policyUrl: (vendor as unknown as { policyUrl?: string }).policyUrl ?? '',
		usesNonCookieAccess: vendor.usesNonCookieAccess,
		deviceStorageDisclosureUrl: vendor.deviceStorageDisclosureUrl ?? null,
		usesCookies: vendor.usesCookies,
		cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
		cookieRefresh: vendor.cookieRefresh,
		legitimateInterestUrl:
			vendor.urls?.find((url) => url.legIntClaim)?.legIntClaim ?? null,
		specialPurposes: vendor.specialPurposes || [],
		specialFeatures: vendor.specialFeatures || [],
		features: vendor.features || [],
		purposes: vendor.purposes || [],
		legIntPurposes: vendor.legIntPurposes || [],
		usesLegitimateInterest: purposeId
			? (vendor.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		dataRetention: vendor.dataRetention,
		isCustom: false,
	};
}

function mapCustomVendor(
	vendor: NonIABVendor,
	purposeId?: number
): HeadlessIABProcessedVendor {
	return {
		id: vendor.id,
		name: vendor.name,
		policyUrl: vendor.privacyPolicyUrl,
		usesNonCookieAccess: vendor.usesNonCookieAccess ?? false,
		deviceStorageDisclosureUrl: null,
		usesCookies: vendor.usesCookies ?? false,
		cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds ?? null,
		cookieRefresh: undefined,
		legitimateInterestUrl: null,
		specialPurposes: [],
		specialFeatures: vendor.specialFeatures || [],
		features: vendor.features || [],
		purposes: vendor.purposes || [],
		legIntPurposes: vendor.legIntPurposes || [],
		usesLegitimateInterest: purposeId
			? (vendor.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		dataRetention: undefined,
		isCustom: true,
	};
}

function processPurposes(
	gvl: GlobalVendorList,
	customVendors: NonIABVendor[]
): HeadlessIABProcessedPurpose[] {
	return Object.entries(gvl.purposes)
		.map(([id, purpose]) => {
			const purposeId = Number(id);
			const iabVendorsForPurpose = Object.entries(gvl.vendors)
				.filter(([, vendor]) => {
					return (
						vendor.purposes?.includes(purposeId) ||
						vendor.legIntPurposes?.includes(purposeId)
					);
				})
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor, purposeId));

			const customVendorsForPurpose = customVendors
				.filter((vendor) => {
					return (
						vendor.purposes?.includes(purposeId) ||
						vendor.legIntPurposes?.includes(purposeId)
					);
				})
				.map((vendor) => mapCustomVendor(vendor, purposeId));

			return {
				id: purposeId,
				name: purpose.name,
				description: purpose.description,
				descriptionLegal: purpose.descriptionLegal,
				illustrations: purpose.illustrations || [],
				vendors: [...iabVendorsForPurpose, ...customVendorsForPurpose],
			};
		})
		.filter((purpose) => purpose.vendors.length > 0);
}

function processSpecialPurposes(
	gvl: GlobalVendorList
): HeadlessIABProcessedPurpose[] {
	return Object.entries(gvl.specialPurposes || {})
		.map(([id, purpose]) => {
			const purposeId = Number(id);
			const vendorsForPurpose = Object.entries(gvl.vendors)
				.filter(([, vendor]) => {
					return vendor.specialPurposes?.includes(purposeId);
				})
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor));

			return {
				id: purposeId,
				name: purpose.name,
				description: purpose.description,
				descriptionLegal: purpose.descriptionLegal,
				illustrations: purpose.illustrations || [],
				vendors: vendorsForPurpose,
				isSpecialPurpose: true,
			};
		})
		.filter((purpose) => purpose.vendors.length > 0);
}

function processSpecialFeatures(
	gvl: GlobalVendorList
): HeadlessIABProcessedSpecialFeature[] {
	return Object.entries(gvl.specialFeatures || {})
		.map(([id, feature]) => {
			const featureId = Number(id);
			const vendorsForFeature = Object.entries(gvl.vendors)
				.filter(([, vendor]) => {
					return vendor.specialFeatures?.includes(featureId);
				})
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor));

			return {
				id: featureId,
				name: feature.name,
				description: feature.description,
				descriptionLegal: feature.descriptionLegal,
				illustrations: feature.illustrations || [],
				vendors: vendorsForFeature,
			};
		})
		.filter((feature) => feature.vendors.length > 0);
}

function processFeatures(gvl: GlobalVendorList): HeadlessIABProcessedFeature[] {
	return Object.entries(gvl.features || {})
		.map(([id, feature]) => {
			const featureId = Number(id);
			const vendorsForFeature = Object.entries(gvl.vendors)
				.filter(([, vendor]) => {
					return vendor.features?.includes(featureId);
				})
				.map(([vendorId, vendor]) => mapGvlVendor(vendorId, vendor));

			return {
				id: featureId,
				name: feature.name,
				description: feature.description,
				descriptionLegal: feature.descriptionLegal,
				illustrations: feature.illustrations || [],
				vendors: vendorsForFeature,
			};
		})
		.filter((feature) => feature.vendors.length > 0);
}

function groupPurposesIntoStacks(
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

	const stackScores: Array<{
		stackId: number;
		stack: (typeof gvlStacks)[number];
		coveredPurposeIds: number[];
		score: number;
	}> = [];

	for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
		const coveredPurposeIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredPurposeIds.length >= 2) {
			stackScores.push({
				stackId: Number(stackIdStr),
				stack,
				coveredPurposeIds,
				score: coveredPurposeIds.length,
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
				id: stackId,
				name: stack.name,
				description: stack.description,
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
}

/**
 * Processes GVL data into a format suitable for the consent dialog UI.
 *
 * @param iab - IAB state with GVL and optional custom vendors
 * @returns Processed GVL data for rendering
 */
export function processGVLForDialog(
	iab: HeadlessIABStateInput | null
): HeadlessIABDialogData {
	if (!iab?.gvl) {
		return {
			...EMPTY_DIALOG_DATA,
			isLoading: Boolean(iab?.isLoadingGVL ?? true),
		};
	}

	const gvl = iab.gvl;
	const customVendors = getCustomVendors(iab);
	const purposes = processPurposes(gvl, customVendors);
	const specialPurposes = processSpecialPurposes(gvl);
	const specialFeatures = processSpecialFeatures(gvl);
	const features = processFeatures(gvl);
	const { stacks, standalonePurposes } = groupPurposesIntoStacks(gvl, purposes);

	return {
		purposes,
		specialPurposes,
		specialFeatures,
		features,
		stacks,
		standalonePurposes,
		totalVendors: Object.keys(gvl.vendors).length + customVendors.length,
		isLoading: Boolean(iab.isLoadingGVL || !iab.gvl),
		isReady: true,
	};
}

export type {
	HeadlessIABDialogData as ProcessedGVLData,
	HeadlessIABProcessedFeature as ProcessedFeature,
	HeadlessIABProcessedPurpose as ProcessedPurpose,
	HeadlessIABProcessedSpecialFeature as ProcessedSpecialFeature,
	HeadlessIABProcessedStack as ProcessedStack,
	HeadlessIABProcessedVendor as ProcessedVendor,
};
