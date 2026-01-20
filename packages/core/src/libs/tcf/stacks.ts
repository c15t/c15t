/**
 * Purpose Stacking Utilities
 *
 * Groups IAB purposes into "stacks" for cleaner UI display.
 * Based on IAB TCF specification for purpose presentation.
 *
 * @packageDocumentation
 */

import type { GVLPurpose, GVLStack } from '../../types/iab-tcf';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Purpose 1 is always shown separately as it's required for TCF to function.
 * "Store and/or access information on a device"
 *
 * @public
 */
export const STANDALONE_PURPOSE_ID = 1;

/**
 * Default stacks when GVL doesn't provide stack definitions.
 * These group purposes by their general function.
 *
 * @public
 */
export const DEFAULT_STACKS: Record<number, GVLStack> = {
	1: {
		id: 1,
		name: 'Advertising',
		description: 'Advertising selection, delivery, and reporting',
		purposes: [2, 3, 4],
		specialFeatures: [],
	},
	2: {
		id: 2,
		name: 'Content Personalization',
		description: 'Content selection and personalization',
		purposes: [5, 6, 11],
		specialFeatures: [],
	},
	3: {
		id: 3,
		name: 'Measurement',
		description: 'Performance measurement and analytics',
		purposes: [7, 8, 9],
		specialFeatures: [],
	},
	4: {
		id: 4,
		name: 'Product Development',
		description: 'Product and service development',
		purposes: [10],
		specialFeatures: [],
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A stack with its resolved purposes.
 *
 * @public
 */
export interface ResolvedStack<T extends { id: number }> extends GVLStack {
	/** The purposes included in this stack */
	resolvedPurposes: T[];
}

/**
 * Result of grouping purposes into stacks.
 *
 * @public
 */
export interface GroupedPurposes<T extends { id: number }> {
	/** Stacks with their purposes */
	stacks: Array<ResolvedStack<T>>;

	/** Purposes that are shown standalone (e.g., Purpose 1) */
	standalonePurposes: T[];

	/** Purposes not in any stack */
	ungroupedPurposes: T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouping Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groups purposes into stacks for cleaner UI display.
 *
 * Purpose 1 (Store/access info) is always shown separately as it's
 * required for TCF to function.
 *
 * @param purposes - Array of purposes to group (must have `id` property)
 * @param stacksFromGVL - Optional stacks from the GVL
 * @returns Grouped purposes with stacks and standalone items
 *
 * @example
 * ```typescript
 * const { stacks, standalonePurposes, ungroupedPurposes } =
 *   groupPurposesIntoStacks(gvl.purposes, gvl.stacks);
 *
 * // Render standalone purposes first (Purpose 1)
 * standalonePurposes.forEach(purpose => {
 *   renderPurpose(purpose);
 * });
 *
 * // Then render stacks
 * stacks.forEach(stack => {
 *   renderStackHeader(stack.name, stack.description);
 *   stack.resolvedPurposes.forEach(purpose => {
 *     renderPurpose(purpose);
 *   });
 * });
 * ```
 *
 * @public
 */
export function groupPurposesIntoStacks<T extends { id: number }>(
	purposes: T[] | Record<number, T>,
	stacksFromGVL?: Record<number, GVLStack>
): GroupedPurposes<T> {
	// Convert to array if object
	const purposeArray = Array.isArray(purposes)
		? purposes
		: Object.values(purposes);

	// Create a map for quick lookup
	const purposeMap = new Map<number, T>();
	for (const purpose of purposeArray) {
		purposeMap.set(purpose.id, purpose);
	}

	// Use GVL stacks or default stacks
	const stacks = stacksFromGVL ?? DEFAULT_STACKS;

	// Track which purposes are assigned
	const assignedPurposeIds = new Set<number>();

	// Extract standalone purposes (Purpose 1)
	const standalonePurposes: T[] = [];
	const standalonePurpose = purposeMap.get(STANDALONE_PURPOSE_ID);
	if (standalonePurpose) {
		standalonePurposes.push(standalonePurpose);
		assignedPurposeIds.add(STANDALONE_PURPOSE_ID);
	}

	// Build resolved stacks
	const resolvedStacks: Array<ResolvedStack<T>> = [];

	for (const stack of Object.values(stacks)) {
		const resolvedPurposes: T[] = [];

		for (const purposeId of stack.purposes) {
			// Skip Purpose 1 (always standalone)
			if (purposeId === STANDALONE_PURPOSE_ID) {
				continue;
			}

			const purpose = purposeMap.get(purposeId);
			if (purpose) {
				resolvedPurposes.push(purpose);
				assignedPurposeIds.add(purposeId);
			}
		}

		// Only include stack if it has purposes
		if (resolvedPurposes.length > 0) {
			resolvedStacks.push({
				...stack,
				resolvedPurposes,
			});
		}
	}

	// Find ungrouped purposes
	const ungroupedPurposes: T[] = [];
	for (const purpose of purposeArray) {
		if (!assignedPurposeIds.has(purpose.id)) {
			ungroupedPurposes.push(purpose);
		}
	}

	return {
		stacks: resolvedStacks,
		standalonePurposes,
		ungroupedPurposes,
	};
}

/**
 * Gets the stack that contains a specific purpose.
 *
 * @param purposeId - The purpose ID to find
 * @param stacksFromGVL - Optional stacks from the GVL
 * @returns The stack containing the purpose, or null if standalone/ungrouped
 *
 * @public
 */
export function getStackForPurpose(
	purposeId: number,
	stacksFromGVL?: Record<number, GVLStack>
): GVLStack | null {
	// Purpose 1 is always standalone
	if (purposeId === STANDALONE_PURPOSE_ID) {
		return null;
	}

	const stacks = stacksFromGVL ?? DEFAULT_STACKS;

	for (const stack of Object.values(stacks)) {
		if (stack.purposes.includes(purposeId)) {
			return stack;
		}
	}

	return null;
}

/**
 * Checks if a purpose should be shown standalone.
 *
 * @param purposeId - The purpose ID to check
 * @returns True if the purpose should be shown standalone
 *
 * @public
 */
export function isStandalonePurpose(purposeId: number): boolean {
	return purposeId === STANDALONE_PURPOSE_ID;
}

/**
 * Gets all purposes in a stack.
 *
 * @param stackId - The stack ID
 * @param purposes - All available purposes
 * @param stacksFromGVL - Optional stacks from the GVL
 * @returns Array of purposes in the stack
 *
 * @public
 */
export function getPurposesInStack<T extends { id: number }>(
	stackId: number,
	purposes: T[] | Record<number, T>,
	stacksFromGVL?: Record<number, GVLStack>
): T[] {
	const stacks = stacksFromGVL ?? DEFAULT_STACKS;
	const stack = stacks[stackId];

	if (!stack) {
		return [];
	}

	// Convert to array if object
	const purposeArray = Array.isArray(purposes)
		? purposes
		: Object.values(purposes);

	// Create a map for quick lookup
	const purposeMap = new Map<number, T>();
	for (const purpose of purposeArray) {
		purposeMap.set(purpose.id, purpose);
	}

	// Get purposes in stack
	return stack.purposes
		.filter((id) => id !== STANDALONE_PURPOSE_ID)
		.map((id) => purposeMap.get(id))
		.filter((p): p is T => p !== undefined);
}

/**
 * Creates a flat list of purposes ordered by stack.
 *
 * Useful for linear UI layouts while maintaining logical grouping.
 *
 * @param purposes - All purposes
 * @param stacksFromGVL - Optional stacks from the GVL
 * @returns Ordered array of purposes
 *
 * @public
 */
export function flattenPurposesByStack<T extends { id: number }>(
	purposes: T[] | Record<number, T>,
	stacksFromGVL?: Record<number, GVLStack>
): T[] {
	const { standalonePurposes, stacks, ungroupedPurposes } =
		groupPurposesIntoStacks(purposes, stacksFromGVL);

	const result: T[] = [];

	// Standalone first
	result.push(...standalonePurposes);

	// Then stacks in order
	for (const stack of stacks) {
		result.push(...stack.resolvedPurposes);
	}

	// Then ungrouped
	result.push(...ungroupedPurposes);

	return result;
}

/**
 * Converts GVL purposes record to array sorted by ID.
 *
 * @param purposes - GVL purposes object
 * @returns Sorted array of purposes
 *
 * @public
 */
export function purposesToArray(
	purposes: Record<number, GVLPurpose>
): GVLPurpose[] {
	return Object.values(purposes).sort((a, b) => a.id - b.id);
}
