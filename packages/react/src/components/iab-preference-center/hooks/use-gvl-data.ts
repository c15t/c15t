'use client';

import { useMemo } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import type {
	ProcessedPurpose,
	ProcessedSpecialFeature,
	ProcessedStack,
	ProcessedVendor,
} from '../types';

/**
 * Processed GVL data for the IAB Preference Center.
 * @public
 */
export interface GVLData {
	purposes: ProcessedPurpose[];
	specialPurposes: ProcessedPurpose[];
	specialFeatures: ProcessedSpecialFeature[];
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
 * for use in the preference center UI. Handles purpose grouping into stacks,
 * standalone purposes, special purposes/features, and vendor mapping.
 *
 * @returns Processed GVL data ready for UI rendering
 * @public
 */
export function useGVLData(): GVLData {
	const { iab: iabState } = useConsentManager();

	// Process GVL data into UI-friendly format
	const {
		purposes,
		specialPurposes,
		specialFeatures,
		stacks,
		standalonePurposes,
	} = useMemo(() => {
		if (!iabState?.gvl) {
			return {
				purposes: [],
				specialPurposes: [],
				specialFeatures: [],
				stacks: [] as ProcessedStack[],
				standalonePurposes: [],
			};
		}

		const gvl = iabState.gvl;
		const customVendors = iabState.nonIABVendors || [];

		// Generate numeric IDs for custom vendors (starting from 90000 to avoid collision)
		const customVendorIdMap = new Map<string, number>();
		customVendors.forEach((cv, index) => {
			customVendorIdMap.set(cv.id, 90000 + index);
		});

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
			specialPurposes: vendor.specialPurposes || [],
			specialFeatures: vendor.specialFeatures || [],
			purposes: vendor.purposes || [],
			legIntPurposes: vendor.legIntPurposes || [],
			usesLegitimateInterest: purposeId
				? (vendor.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			isCustom: false,
		});

		// Helper to map custom vendor to ProcessedVendor
		const mapCustomVendor = (
			cv: (typeof customVendors)[number],
			purposeId?: number
		): ProcessedVendor => ({
			id: customVendorIdMap.get(cv.id) ?? 90000,
			name: cv.name,
			policyUrl: cv.privacyPolicyUrl,
			usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
			deviceStorageDisclosureUrl: null,
			usesCookies: cv.usesCookies ?? false,
			cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
			specialPurposes: [],
			specialFeatures: cv.specialFeatures || [],
			purposes: cv.purposes || [],
			legIntPurposes: cv.legIntPurposes || [],
			usesLegitimateInterest: purposeId
				? (cv.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			isCustom: true,
		});

		// Process purposes
		const processedPurposes: ProcessedPurpose[] = Object.entries(gvl.purposes)
			.map(([id, purpose]) => {
				// Get IAB vendors for this purpose (all vendors from GVL)
				const iabVendorsForPurpose: ProcessedVendor[] = Object.entries(
					gvl.vendors
				)
					.filter(([, vendor]) => {
						return (
							vendor.purposes?.includes(Number(id)) ||
							vendor.legIntPurposes?.includes(Number(id))
						);
					})
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor, Number(id)));

				// Get custom vendors for this purpose
				const customVendorsForPurpose: ProcessedVendor[] = customVendors
					.filter((cv) => {
						return (
							cv.purposes?.includes(Number(id)) ||
							cv.legIntPurposes?.includes(Number(id))
						);
					})
					.map((cv) => mapCustomVendor(cv, Number(id)));

				return {
					id: Number(id),
					name: purpose.name,
					description: purpose.description,
					descriptionLegal: purpose.descriptionLegal,
					illustrations: purpose.illustrations || [],
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
					.filter(([, vendor]) => {
						return vendor.specialPurposes?.includes(Number(id));
					})
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					id: Number(id),
					name: purpose.name,
					description: purpose.description,
					descriptionLegal: purpose.descriptionLegal,
					illustrations: purpose.illustrations || [],
					vendors: vendorsForPurpose,
					isSpecialPurpose: true,
				};
			})
			.filter((sp) => sp.vendors.length > 0);

		// Process special features
		const processedSpecialFeatures: ProcessedSpecialFeature[] = Object.entries(
			gvl.specialFeatures || {}
		)
			.map(([id, feature]) => {
				const vendorsForFeature: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => {
						return vendor.specialFeatures?.includes(Number(id));
					})
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					id: Number(id),
					name: feature.name,
					description: feature.description,
					descriptionLegal: feature.descriptionLegal,
					illustrations: feature.illustrations || [],
					vendors: vendorsForFeature,
				};
			})
			.filter((sf) => sf.vendors.length > 0);

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
		const stackScores: Array<{
			stackId: number;
			stack: (typeof gvlStacks)[number];
			coveredPurposeIds: number[];
			score: number;
		}> = [];

		for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
			const stackId = Number(stackIdStr);
			const coveredIds = stack.purposes.filter((pid) =>
				otherPurposeIds.has(pid)
			);
			if (coveredIds.length >= 2) {
				// Only consider stacks that cover 2+ purposes
				stackScores.push({
					stackId,
					stack,
					coveredPurposeIds: coveredIds,
					score: coveredIds.length,
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
			stacks: processedStacks,
			standalonePurposes: finalStandalonePurposes,
		};
	}, [iabState?.gvl, iabState?.nonIABVendors]);

	// Get total vendor count (all GVL vendors + custom vendors)
	const totalVendors = useMemo(() => {
		if (!iabState?.gvl) {
			return 0;
		}
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	}, [iabState?.gvl, iabState?.nonIABVendors]);

	const isLoading = iabState?.isLoadingGVL || !iabState?.gvl;

	return {
		purposes,
		specialPurposes,
		specialFeatures,
		stacks,
		standalonePurposes,
		totalVendors,
		isLoading: Boolean(isLoading),
	};
}
