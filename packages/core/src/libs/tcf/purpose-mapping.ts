/**
 * IAB Purpose to c15t Consent Mapping
 *
 * Maps IAB TCF purposes (1-11) to c15t's consent categories.
 *
 * @packageDocumentation
 */

import type { AllConsentNames } from '../../types/gdpr';

// ─────────────────────────────────────────────────────────────────────────────
// Purpose Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps IAB TCF purpose IDs to c15t consent categories.
 *
 * IAB TCF 2.3 defines 11 purposes:
 * - Purpose 1: Store and/or access information on a device -> `necessary`
 * - Purpose 2: Use limited data to select advertising -> `marketing`
 * - Purpose 3: Create profiles for personalised advertising -> `marketing`
 * - Purpose 4: Use profiles to select personalised advertising -> `marketing`
 * - Purpose 5: Create profiles to personalise content -> `experience`
 * - Purpose 6: Use profiles to select personalised content -> `experience`
 * - Purpose 7: Measure advertising performance -> `measurement`
 * - Purpose 8: Measure content performance -> `measurement`
 * - Purpose 9: Understand audiences through statistics -> `measurement`
 * - Purpose 10: Develop and improve services -> `functionality`
 * - Purpose 11: Use limited data to select content -> `functionality`
 *
 * @public
 */
export const IAB_PURPOSE_TO_C15T_MAP: Record<number, AllConsentNames> = {
	1: 'necessary',
	2: 'marketing',
	3: 'marketing',
	4: 'marketing',
	5: 'experience',
	6: 'experience',
	7: 'measurement',
	8: 'measurement',
	9: 'measurement',
	10: 'functionality',
	11: 'functionality',
};

/**
 * Maps c15t consent categories to IAB TCF purpose IDs.
 *
 * @public
 */
export const C15T_TO_IAB_PURPOSE_MAP: Record<AllConsentNames, number[]> = {
	necessary: [1],
	marketing: [2, 3, 4],
	experience: [5, 6],
	measurement: [7, 8, 9],
	functionality: [10, 11],
};

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an IAB purpose ID to a c15t consent category.
 *
 * @param purposeId - IAB purpose ID (1-11)
 * @returns The corresponding c15t consent category, or null if invalid
 *
 * @example
 * ```typescript
 * iabPurposeToC15t(1); // 'necessary'
 * iabPurposeToC15t(2); // 'marketing'
 * iabPurposeToC15t(7); // 'measurement'
 * iabPurposeToC15t(99); // null
 * ```
 *
 * @public
 */
export function iabPurposeToC15t(purposeId: number): AllConsentNames | null {
	return IAB_PURPOSE_TO_C15T_MAP[purposeId] ?? null;
}

/**
 * Converts a c15t consent category to IAB purpose IDs.
 *
 * @param category - c15t consent category
 * @returns Array of corresponding IAB purpose IDs
 *
 * @example
 * ```typescript
 * c15tToIabPurposes('marketing'); // [2, 3, 4]
 * c15tToIabPurposes('measurement'); // [7, 8, 9]
 * ```
 *
 * @public
 */
export function c15tToIabPurposes(category: AllConsentNames): number[] {
	return C15T_TO_IAB_PURPOSE_MAP[category] ?? [];
}

/**
 * Converts c15t consent state to IAB purpose consents.
 *
 * @param consents - c15t consent state object
 * @returns IAB purpose consent state (keyed by purpose ID 1-11)
 *
 * @example
 * ```typescript
 * const c15tConsents = {
 *   necessary: true,
 *   marketing: false,
 *   experience: true,
 *   measurement: true,
 *   functionality: false,
 * };
 *
 * const purposeConsents = c15tConsentsToIabPurposes(c15tConsents);
 * // {
 * //   1: true,  // necessary
 * //   2: false, 3: false, 4: false,  // marketing
 * //   5: true, 6: true,  // experience
 * //   7: true, 8: true, 9: true,  // measurement
 * //   10: false, 11: false,  // functionality
 * // }
 * ```
 *
 * @public
 */
export function c15tConsentsToIabPurposes(
	consents: Record<AllConsentNames, boolean>
): Record<number, boolean> {
	const purposeConsents: Record<number, boolean> = {};

	for (const [category, value] of Object.entries(consents)) {
		const purposes = C15T_TO_IAB_PURPOSE_MAP[category as AllConsentNames];
		if (purposes) {
			for (const purposeId of purposes) {
				purposeConsents[purposeId] = value;
			}
		}
	}

	return purposeConsents;
}

/**
 * Converts IAB purpose consents to c15t consent state.
 *
 * When multiple IAB purposes map to the same c15t category,
 * the category is considered consented only if ALL its purposes are consented.
 *
 * @param purposeConsents - IAB purpose consent state
 * @returns c15t consent state object
 *
 * @example
 * ```typescript
 * const purposeConsents = {
 *   1: true,
 *   2: false, 3: true, 4: false,  // marketing needs all three
 *   5: true, 6: true,
 *   7: true, 8: true, 9: true,
 *   10: true, 11: true,
 * };
 *
 * const c15tConsents = iabPurposesToC15tConsents(purposeConsents);
 * // {
 * //   necessary: true,
 * //   marketing: false,  // not all marketing purposes consented
 * //   experience: true,
 * //   measurement: true,
 * //   functionality: true,
 * // }
 * ```
 *
 * @public
 */
export function iabPurposesToC15tConsents(
	purposeConsents: Record<number, boolean>
): Record<AllConsentNames, boolean> {
	const c15tConsents: Record<AllConsentNames, boolean> = {
		necessary: false,
		marketing: false,
		experience: false,
		measurement: false,
		functionality: false,
	};

	for (const [category, purposes] of Object.entries(C15T_TO_IAB_PURPOSE_MAP)) {
		// Category is consented if ALL its purposes are consented
		const allConsented = purposes.every(
			(purposeId) => purposeConsents[purposeId] === true
		);
		c15tConsents[category as AllConsentNames] = allConsented;
	}

	return c15tConsents;
}

/**
 * Gets the IAB purpose IDs required by a vendor based on their GVL entry.
 *
 * @param vendorPurposes - Array of purpose IDs from vendor's GVL entry
 * @param vendorLegIntPurposes - Array of legitimate interest purpose IDs
 * @returns Object with purpose arrays categorized by legal basis
 *
 * @public
 */
export function categorizeVendorPurposes(
	vendorPurposes: number[],
	vendorLegIntPurposes: number[] = []
): {
	consentRequired: number[];
	legitInterest: number[];
	all: number[];
} {
	return {
		consentRequired: vendorPurposes,
		legitInterest: vendorLegIntPurposes,
		all: [...new Set([...vendorPurposes, ...vendorLegIntPurposes])],
	};
}

/**
 * Checks if a vendor has consent for all their required purposes.
 *
 * @param vendorPurposes - Purpose IDs the vendor requires consent for
 * @param vendorLegIntPurposes - Purpose IDs claimed under legitimate interest
 * @param purposeConsents - Current purpose consent state
 * @param purposeLegitInterests - Current purpose legitimate interest state
 * @returns True if all required consents/interests are granted
 *
 * @public
 */
export function vendorHasRequiredConsents(
	vendorPurposes: number[],
	vendorLegIntPurposes: number[],
	purposeConsents: Record<number, boolean>,
	purposeLegitInterests: Record<number, boolean>
): boolean {
	// Check consent purposes
	const hasAllConsents = vendorPurposes.every(
		(purposeId) => purposeConsents[purposeId] === true
	);

	// Check legitimate interest purposes
	const hasAllLegitInterests = vendorLegIntPurposes.every(
		(purposeId) => purposeLegitInterests[purposeId] === true
	);

	return hasAllConsents && hasAllLegitInterests;
}
