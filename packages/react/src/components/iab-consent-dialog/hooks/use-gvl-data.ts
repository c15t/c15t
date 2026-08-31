'use client';

import { useMemo } from 'react';

import { useConsentManager } from '~/hooks/use-consent-manager';

import type {
	ProcessedFeature,
	ProcessedPurpose,
	ProcessedSpecialFeature,
	ProcessedStack,
	ProcessedVendor,
} from '../types';

/**
 * Processed GVL data for the IAB Consent Dialog.
 * @public
 */
export interface GVLData {
	purposes: ProcessedPurpose[];
	specialPurposes: ProcessedPurpose[];
	specialFeatures: ProcessedSpecialFeature[];
	features: ProcessedFeature[];
	stacks: ProcessedStack[];
	standalonePurposes: ProcessedPurpose[];
	totalVendors: number;
	isLoading: boolean;
}

/**
 * Hook to process GVL (Global Vendor List) data into UI-friendly format.
 *
 * @remarks
 * Extracts and processes vendor, purpose, and feature data from the IAB TCF GVL
 * for use in the consent dialog UI. Handles purpose grouping into stacks,
 * standalone purposes, special purposes/features, and vendor mapping.
 *
 * @returns Processed GVL data ready for UI rendering
 * @public
 */
export const useGVLData = function useGVLData(): GVLData {
	const { iab: iabState } = useConsentManager();

	// Process GVL data into UI-friendly format
	const {
		purposes,
		specialPurposes,
		specialFeatures,
		features,
		stacks,
		standalonePurposes,
	} = useMemo(() => {
		if (!iabState?.gvl) {
			return {
				features: [],
				purposes: [],
				specialFeatures: [],
				specialPurposes: [],
				stacks: [] as ProcessedStack[],
				standalonePurposes: [],
			};
		}

		const { gvl } = iabState;
		const customVendors = iabState.nonIABVendors || [];

		// Helper to map GVL vendor to ProcessedVendor
		const mapVendor = (
			vendorId: string,
			vendor: (typeof gvl.vendors)[number],
			purposeId?: number
		): ProcessedVendor => ({
			cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
			deviceStorageDisclosureUrl: vendor.deviceStorageDisclosureUrl ?? null,
			features: vendor.features || [],
			id: Number(vendorId),
			isCustom: false,
			legIntPurposes: vendor.legIntPurposes || [],
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
		});

		// Helper to map custom vendor to ProcessedVendor
		const mapCustomVendor = (
			cv: (typeof customVendors)[number],
			purposeId?: number
		): ProcessedVendor => ({
			cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
			deviceStorageDisclosureUrl: null,
			features: cv.features || [],
			id: cv.id,
			isCustom: true,
			legIntPurposes: cv.legIntPurposes || [],
			name: cv.name,
			policyUrl: cv.privacyPolicyUrl,
			purposes: cv.purposes || [],
			specialFeatures: cv.specialFeatures || [],
			specialPurposes: [],
			usesCookies: cv.usesCookies ?? false,
			usesLegitimateInterest: purposeId
				? (cv.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
		});

		// Process purposes
		const processedPurposes: ProcessedPurpose[] = Object.entries(gvl.purposes)
			.map(([id, purpose]) => {
				// Get IAB vendors for this purpose (all vendors from GVL)
				const iabVendorsForPurpose: ProcessedVendor[] = Object.entries(
					gvl.vendors
				)
					.filter(
						([, vendor]) =>
							vendor.purposes?.includes(Number(id)) ||
							vendor.legIntPurposes?.includes(Number(id))
					)
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor, Number(id)));

				// Get custom vendors for this purpose
				const customVendorsForPurpose: ProcessedVendor[] = customVendors
					.filter(
						(cv) =>
							cv.purposes?.includes(Number(id)) ||
							cv.legIntPurposes?.includes(Number(id))
					)
					.map((cv) => mapCustomVendor(cv, Number(id)));

				return {
					description: purpose.description,
					descriptionLegal: purpose.descriptionLegal,
					id: Number(id),
					illustrations: purpose.illustrations || [],
					name: purpose.name,
					vendors: [...iabVendorsForPurpose, ...customVendorsForPurpose],
				};
			})
			.filter((purpose) => purpose.vendors.length > 0);

		// Process special purposes
		const processedSpecialPurposes: ProcessedPurpose[] = Object.entries(
			gvl.specialPurposes || {}
		)
			.map(([id, purpose]) => {
				const vendorsForPurpose: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => vendor.specialPurposes?.includes(Number(id)))
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					description: purpose.description,
					descriptionLegal: purpose.descriptionLegal,
					id: Number(id),
					illustrations: purpose.illustrations || [],
					isSpecialPurpose: true,
					name: purpose.name,
					vendors: vendorsForPurpose,
				};
			})
			.filter((sp) => sp.vendors.length > 0);

		// Process special features
		const processedSpecialFeatures: ProcessedSpecialFeature[] = Object.entries(
			gvl.specialFeatures || {}
		)
			.map(([id, feature]) => {
				const vendorsForFeature: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => vendor.specialFeatures?.includes(Number(id)))
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					description: feature.description,
					descriptionLegal: feature.descriptionLegal,
					id: Number(id),
					illustrations: feature.illustrations || [],
					name: feature.name,
					vendors: vendorsForFeature,
				};
			})
			.filter((sf) => sf.vendors.length > 0);

		// Process features (informational, no consent toggle)
		const processedFeatures: ProcessedFeature[] = Object.entries(
			gvl.features || {}
		)
			.map(([id, feature]) => {
				const vendorsForFeature: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => vendor.features?.includes(Number(id)))
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					description: feature.description,
					descriptionLegal: feature.descriptionLegal,
					id: Number(id),
					illustrations: feature.illustrations || [],
					name: feature.name,
					vendors: vendorsForFeature,
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

		// Use stacks from GVL if available
		const gvlStacks = gvl.stacks || {};

		// Score each stack by how many of our purposes it covers
		const stackScores: {
			stackId: number;
			stack: (typeof gvlStacks)[number];
			coveredPurposeIds: number[];
			score: number;
		}[] = [];

		for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
			const stackId = Number(stackIdStr);
			const coveredIds = stack.purposes.filter((pid) =>
				otherPurposeIds.has(pid)
			);
			if (coveredIds.length >= 2) {
				// Only consider stacks that cover 2+ purposes
				stackScores.push({
					coveredPurposeIds: coveredIds,
					score: coveredIds.length,
					stack,
					stackId,
				});
			}
		}

		// Sort stacks by score descending (prefer stacks that cover more purposes)
		stackScores.sort((a, b) => b.score - a.score);

		// Greedily select stacks, ensuring each purpose is only covered once
		const processedStacks: ProcessedStack[] = [];
		const assignedPurposeIds = new Set<number>();

		for (const { stackId, stack, coveredPurposeIds: covered } of stackScores) {
			// Only use this stack if it covers at least one unassigned purpose
			const unassignedInStack = covered.filter(
				(pid) => !assignedPurposeIds.has(pid)
			);
			if (unassignedInStack.length >= 2) {
				// Get purposes for this stack (only unassigned ones)
				const stackPurposes = otherPurposes.filter((p) =>
					unassignedInStack.includes(p.id)
				);
				processedStacks.push({
					description: stack.description,
					id: stackId,
					name: stack.name,
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
			features: processedFeatures,
			purposes: processedPurposes,
			specialFeatures: processedSpecialFeatures,
			specialPurposes: processedSpecialPurposes,
			stacks: processedStacks,
			standalonePurposes: finalStandalonePurposes,
		};
	}, [iabState]);

	// Get total vendor count (all GVL vendors + custom vendors)
	const totalVendors = useMemo(() => {
		if (!iabState?.gvl) {
			return 0;
		}
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	}, [iabState]);

	const isLoading = iabState?.isLoadingGVL || !iabState?.gvl;

	return {
		features,
		isLoading: Boolean(isLoading),
		purposes,
		specialFeatures,
		specialPurposes,
		stacks,
		standalonePurposes,
		totalVendors,
	};
};
