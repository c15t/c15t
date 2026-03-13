import type { GlobalVendorList } from 'c15t';

export type VendorId = number | string;

/**
 * Processed vendor data for UI display.
 */
export interface ProcessedVendor {
	id: VendorId;
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
 * Processed purpose data for UI display.
 */
export interface ProcessedPurpose {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: ProcessedVendor[];
	isSpecialPurpose?: boolean;
}

/**
 * Special feature data for UI display.
 */
export interface ProcessedSpecialFeature {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: ProcessedVendor[];
}

/**
 * Feature data for UI display (informational, no consent toggle).
 */
export interface ProcessedFeature {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: ProcessedVendor[];
}

/**
 * Stack data with resolved purposes.
 */
export interface ProcessedStack {
	id: number;
	name: string;
	description: string;
	purposes: ProcessedPurpose[];
}

/** Custom vendor not registered with IAB */
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

/**
 * Result of processing GVL data into UI-friendly format.
 */
export interface ProcessedGVLData {
	purposes: ProcessedPurpose[];
	specialPurposes: ProcessedPurpose[];
	specialFeatures: ProcessedSpecialFeature[];
	features: ProcessedFeature[];
	stacks: ProcessedStack[];
	standalonePurposes: ProcessedPurpose[];
}

/**
 * Process raw GVL data into UI-friendly format.
 * Shared between IABConsentBanner and IABConsentDialog.
 */
export function processGVLData(
	gvl: GlobalVendorList,
	customVendors: NonIABVendor[] = []
): ProcessedGVLData {
	// Helper to map GVL vendor to ProcessedVendor
	const mapVendor = (
		vendorId: string,
		vendor: (typeof gvl.vendors)[number],
		purposeId?: number
	): ProcessedVendor => ({
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
	});

	// Helper to map custom vendor to ProcessedVendor
	const mapCustomVendor = (
		cv: NonIABVendor,
		purposeId?: number
	): ProcessedVendor => ({
		id: cv.id,
		name: cv.name,
		policyUrl: cv.privacyPolicyUrl,
		usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
		deviceStorageDisclosureUrl: null,
		usesCookies: cv.usesCookies ?? false,
		cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
		cookieRefresh: undefined,
		legitimateInterestUrl: null,
		specialPurposes: [],
		specialFeatures: cv.specialFeatures || [],
		features: cv.features || [],
		purposes: cv.purposes || [],
		legIntPurposes: cv.legIntPurposes || [],
		usesLegitimateInterest: purposeId
			? (cv.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		dataRetention: undefined,
		isCustom: true,
	});

	// Process purposes
	const processedPurposes: ProcessedPurpose[] = Object.entries(gvl.purposes)
		.map(([id, purpose]) => {
			const iabVendors: ProcessedVendor[] = Object.entries(gvl.vendors)
				.filter(
					([, vendor]) =>
						vendor.purposes?.includes(Number(id)) ||
						vendor.legIntPurposes?.includes(Number(id))
				)
				.map(([vendorId, vendor]) => mapVendor(vendorId, vendor, Number(id)));

			const customVendorsForPurpose: ProcessedVendor[] = customVendors
				.filter(
					(cv) =>
						cv.purposes?.includes(Number(id)) ||
						cv.legIntPurposes?.includes(Number(id))
				)
				.map((cv) => mapCustomVendor(cv, Number(id)));

			return {
				id: Number(id),
				name: purpose.name,
				description: purpose.description,
				descriptionLegal: purpose.descriptionLegal,
				illustrations: purpose.illustrations || [],
				vendors: [...iabVendors, ...customVendorsForPurpose],
			};
		})
		.filter((purpose) => purpose.vendors.length > 0);

	// Process special purposes
	const processedSpecialPurposes: ProcessedPurpose[] = Object.entries(
		gvl.specialPurposes || {}
	)
		.map(([id, purpose]) => {
			const vendors: ProcessedVendor[] = Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.specialPurposes?.includes(Number(id)))
				.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

			return {
				id: Number(id),
				name: purpose.name,
				description: purpose.description,
				descriptionLegal: purpose.descriptionLegal,
				illustrations: purpose.illustrations || [],
				vendors,
				isSpecialPurpose: true,
			};
		})
		.filter((sp) => sp.vendors.length > 0);

	// Process special features
	const processedSpecialFeatures: ProcessedSpecialFeature[] = Object.entries(
		gvl.specialFeatures || {}
	)
		.map(([id, feature]) => {
			const vendors: ProcessedVendor[] = Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.specialFeatures?.includes(Number(id)))
				.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

			return {
				id: Number(id),
				name: feature.name,
				description: feature.description,
				descriptionLegal: feature.descriptionLegal,
				illustrations: feature.illustrations || [],
				vendors,
			};
		})
		.filter((sf) => sf.vendors.length > 0);

	// Process features (informational, no consent toggle)
	const processedFeatures: ProcessedFeature[] = Object.entries(
		gvl.features || {}
	)
		.map(([id, feature]) => {
			const vendors: ProcessedVendor[] = Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.features?.includes(Number(id)))
				.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

			return {
				id: Number(id),
				name: feature.name,
				description: feature.description,
				descriptionLegal: feature.descriptionLegal,
				illustrations: feature.illustrations || [],
				vendors,
			};
		})
		.filter((f) => f.vendors.length > 0);

	// Group purposes into stacks (Purpose 1 is always standalone per IAB TCF spec)
	const STANDALONE_PURPOSE_ID = 1;
	const standalonePurpose = processedPurposes.find(
		(p) => p.id === STANDALONE_PURPOSE_ID
	);
	const otherPurposes = processedPurposes.filter(
		(p) => p.id !== STANDALONE_PURPOSE_ID
	);
	const otherPurposeIds = new Set(otherPurposes.map((p) => p.id));

	const gvlStacks = gvl.stacks || {};

	// Score each stack by how many purposes it covers
	const stackScores: Array<{
		stackId: number;
		stack: (typeof gvlStacks)[number];
		coveredPurposeIds: number[];
		score: number;
	}> = [];

	for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
		const coveredIds = stack.purposes.filter((pid) => otherPurposeIds.has(pid));
		if (coveredIds.length >= 2) {
			stackScores.push({
				stackId: Number(stackIdStr),
				stack,
				coveredPurposeIds: coveredIds,
				score: coveredIds.length,
			});
		}
	}

	stackScores.sort((a, b) => b.score - a.score);

	// Greedily select stacks
	const processedStacks: ProcessedStack[] = [];
	const assignedPurposeIds = new Set<number>();

	for (const { stackId, stack, coveredPurposeIds: covered } of stackScores) {
		const unassignedInStack = covered.filter(
			(pid) => !assignedPurposeIds.has(pid)
		);
		if (unassignedInStack.length >= 2) {
			const stackPurposes = otherPurposes.filter((p) =>
				unassignedInStack.includes(p.id)
			);
			processedStacks.push({
				id: stackId,
				name: stack.name,
				description: stack.description,
				purposes: stackPurposes,
			});
			for (const pid of unassignedInStack) {
				assignedPurposeIds.add(pid);
			}
		}
	}

	// Purposes not assigned to any stack become standalone
	const uncoveredPurposes = otherPurposes.filter(
		(p) => !assignedPurposeIds.has(p.id)
	);

	const finalStandalonePurposes = standalonePurpose
		? [standalonePurpose, ...uncoveredPurposes]
		: uncoveredPurposes;

	return {
		purposes: processedPurposes,
		specialPurposes: processedSpecialPurposes,
		specialFeatures: processedSpecialFeatures,
		features: processedFeatures,
		stacks: processedStacks,
		standalonePurposes: finalStandalonePurposes,
	};
}
