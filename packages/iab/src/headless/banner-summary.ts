/**
 * Framework-agnostic IAB banner summary logic.
 *
 * Extracted from the React useHeadlessIABConsentUI hook to be
 * shared across React, Svelte, Vue, Solid, and Astro.
 *
 * @packageDocumentation
 */

import type { HeadlessIABBannerState, HeadlessIABStateInput } from './types';

/**
 * How many summary items the banner lists before it collapses the rest
 * into "and {count} more". Exported so an adapter that wants to say how
 * many it dropped does not re-guess the number.
 */
export const IAB_BANNER_MAX_DISPLAY_ITEMS = 5;

const STANDALONE_PURPOSE_ID = 1;

/**
 * Resolves the IAB banner summary from the current IAB state.
 *
 * Pure function — no framework reactivity. Each framework package
 * wraps this in its own reactive primitive (useMemo, $derived, computed, etc.).
 */
export const resolveIABBannerSummary = function resolveIABBannerSummary(
	iab: HeadlessIABStateInput | null
): HeadlessIABBannerState {
	if (!iab?.gvl) {
		return {
			displayItems: [],
			isReady: false,
			remainingCount: 0,
			vendorCount: 0,
		};
	}

	const { gvl } = iab;
	const customVendors = iab.nonIABVendors ?? iab.customVendors ?? [];
	const vendorCount = Object.keys(gvl.vendors).length + customVendors.length;

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

	const stackScores: {
		name: string;
		coveredPurposeIds: number[];
		score: number;
	}[] = [];

	for (const stack of Object.values(gvl.stacks || {})) {
		const coveredPurposeIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredPurposeIds.length >= 2) {
			stackScores.push({
				coveredPurposeIds,
				name: stack.name,
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
		displayItems: items.slice(0, IAB_BANNER_MAX_DISPLAY_ITEMS),
		isReady: true,
		remainingCount: Math.max(0, items.length - IAB_BANNER_MAX_DISPLAY_ITEMS),
		vendorCount,
	};
};
