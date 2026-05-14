/**
 * Framework-agnostic IAB banner summary logic.
 *
 * Extracted from the React useHeadlessIABConsentUI hook to be
 * shared across React, Svelte, Vue, Solid, and Astro.
 *
 * @packageDocumentation
 */

import type { IABManager } from 'c15t';
import type { HeadlessIABBannerState } from './types';

const MAX_BANNER_DISPLAY_ITEMS = 5;
const STANDALONE_PURPOSE_ID = 1;

/**
 * Resolves the IAB banner summary from the current IAB state.
 *
 * Pure function — no framework reactivity. Each framework package
 * wraps this in its own reactive primitive (useMemo, $derived, computed, etc.).
 */
export function resolveIABBannerSummary(
	iab: IABManager | null
): HeadlessIABBannerState {
	if (!iab?.gvl) {
		return {
			isReady: false,
			vendorCount: 0,
			displayItems: [],
			remainingCount: 0,
		};
	}

	const gvl = iab.gvl;
	const vendorCount =
		Object.keys(gvl.vendors).length + (iab.nonIABVendors?.length ?? 0);

	const purposesWithVendors = Object.entries(gvl.purposes)
		.filter(([id]) =>
			Object.values(gvl.vendors).some(
				(vendor) =>
					vendor.purposes?.includes(Number(id)) ||
					vendor.legIntPurposes?.includes(Number(id))
			)
		)
		.map(([id, purpose]) => ({ id: Number(id), name: purpose.name }));

	const standalonePurpose = purposesWithVendors.find(
		(purpose) => purpose.id === STANDALONE_PURPOSE_ID
	);
	const otherPurposes = purposesWithVendors.filter(
		(purpose) => purpose.id !== STANDALONE_PURPOSE_ID
	);
	const otherPurposeIds = new Set(otherPurposes.map((purpose) => purpose.id));

	const stackScores: Array<{
		name: string;
		coveredPurposeIds: number[];
		score: number;
	}> = [];

	for (const stack of Object.values(gvl.stacks || {})) {
		const coveredPurposeIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredPurposeIds.length >= 2) {
			stackScores.push({
				name: stack.name,
				coveredPurposeIds,
				score: coveredPurposeIds.length,
			});
		}
	}

	stackScores.sort((a, b) => b.score - a.score);

	const selectedStacks: string[] = [];
	const assignedPurposeIds = new Set<number>();
	for (const { name, coveredPurposeIds } of stackScores) {
		const unassignedPurposes = coveredPurposeIds.filter(
			(purposeId) => !assignedPurposeIds.has(purposeId)
		);
		if (unassignedPurposes.length >= 2) {
			selectedStacks.push(name);
			for (const purposeId of unassignedPurposes) {
				assignedPurposeIds.add(purposeId);
			}
		}
	}

	const uncoveredPurposes = otherPurposes.filter(
		(purpose) => !assignedPurposeIds.has(purpose.id)
	);

	const specialFeaturesWithVendors = Object.entries(gvl.specialFeatures || {})
		.filter(([id]) =>
			Object.values(gvl.vendors).some((vendor) =>
				vendor.specialFeatures?.includes(Number(id))
			)
		)
		.map(([, feature]) => feature.name);

	const items: string[] = [];
	if (standalonePurpose) {
		items.push(standalonePurpose.name);
	}
	for (const stackName of selectedStacks) {
		items.push(stackName);
	}
	for (const purpose of uncoveredPurposes) {
		items.push(purpose.name);
	}
	for (const featureName of specialFeaturesWithVendors) {
		items.push(featureName);
	}

	return {
		isReady: true,
		vendorCount,
		displayItems: items.slice(0, MAX_BANNER_DISPLAY_ITEMS),
		remainingCount: Math.max(0, items.length - MAX_BANNER_DISPLAY_ITEMS),
	};
}
