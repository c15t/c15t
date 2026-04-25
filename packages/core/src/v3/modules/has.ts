/**
 * IAB-aware `has()` for v3 modules.
 *
 * Re-exports the v2 pure condition evaluator (`has`, `HasCondition`,
 * `HasOptions`, `extractConsentNamesFromCondition`) since those are
 * already pure and store-free. Adds:
 *
 * - `hasIABConsent(conditions, iab)` — checks vendor / purpose / LI /
 *   special-feature consent against the IAB slice.
 * - `evaluateConsent(target, snapshot)` — the single entry point the
 *   three blocker modules use: picks IAB vs category evaluation based on
 *   what the target declares + whether the kernel is in `model === 'iab'`.
 *
 * Pure. No DOM. No network. Safe in Node, RSC, edge, tests.
 */
import {
	extractConsentNamesFromCondition,
	type HasCondition,
	type HasOptions,
	has,
} from '../../libs/has';
import type { ConsentState } from '../../types/compliance';
import type { AllConsentNames } from '../../types/consent-types';
import type { ConsentSnapshot, KernelIABState } from '../types';

export type { HasCondition, HasOptions };
export { extractConsentNamesFromCondition, has };

/**
 * IAB-specific consent shape — the subset of the kernel's `iab` slice
 * that `hasIABConsent` actually reads. Kept narrow so non-IAB modules
 * can construct minimal objects in tests without stubbing the whole
 * slice.
 */
export interface IABConsentInputs {
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests: Record<string, boolean>;
	purposeConsents: Record<number, boolean>;
	purposeLegitimateInterests: Record<number, boolean>;
	specialFeatureOptIns: Record<number, boolean>;
}

/**
 * Whatever is being gated (script, network rule, iframe) may carry IAB
 * metadata. The evaluator treats any of these as "IAB path eligible"
 * when model === 'iab'.
 */
export interface IABTarget {
	vendorId?: number | string;
	iabPurposes?: number[];
	iabLegIntPurposes?: number[];
	iabSpecialFeatures?: number[];
}

/**
 * Evaluates IAB consent for a target that has IAB metadata. Semantics
 * match v2's `hasIABConsent` at `packages/core/src/libs/script-loader/core.ts:57-97`:
 * - If `vendorId` is set, require `vendorConsents[vendorId] === true`.
 * - If `iabPurposes` set, require ALL of them in `purposeConsents`.
 * - If `iabLegIntPurposes` set, require ALL in `purposeLegitimateInterests`.
 * - If `iabSpecialFeatures` set, require ALL in `specialFeatureOptIns`.
 *
 * Missing IAB fields are vacuously true — an empty IAB target passes.
 */
export function hasIABConsent(
	target: IABTarget,
	iab: IABConsentInputs
): boolean {
	if (target.vendorId !== undefined) {
		const key = String(target.vendorId);
		if (!iab.vendorConsents[key]) return false;
	}
	if (target.iabPurposes && target.iabPurposes.length > 0) {
		if (!target.iabPurposes.every((id) => iab.purposeConsents[id] === true)) {
			return false;
		}
	}
	if (target.iabLegIntPurposes && target.iabLegIntPurposes.length > 0) {
		if (
			!target.iabLegIntPurposes.every(
				(id) => iab.purposeLegitimateInterests[id] === true
			)
		) {
			return false;
		}
	}
	if (target.iabSpecialFeatures && target.iabSpecialFeatures.length > 0) {
		if (
			!target.iabSpecialFeatures.every(
				(id) => iab.specialFeatureOptIns[id] === true
			)
		) {
			return false;
		}
	}
	return true;
}

/**
 * Target shape the three blocker modules evaluate against. Has a
 * category condition (always required) plus optional IAB metadata.
 */
export interface ConsentGate<
	CategoryType extends AllConsentNames = AllConsentNames,
> extends IABTarget {
	category: HasCondition<CategoryType>;
}

/**
 * Single entry point for scripts, network rules, iframe categories.
 *
 * Behavior:
 * - If the kernel is in `model === 'iab'` AND the target declares ANY
 *   IAB metadata, evaluate via `hasIABConsent`. (Pure v2 parity.)
 * - Otherwise, evaluate `category` via the pure `has()` condition tree
 *   with the snapshot's policy scope applied.
 *
 * Returns `true` iff the target is allowed to load / fire / render.
 */
export function evaluateConsent<CategoryType extends AllConsentNames>(
	target: ConsentGate<CategoryType>,
	snapshot: ConsentSnapshot
): boolean {
	const hasIABFields =
		target.vendorId !== undefined ||
		(target.iabPurposes && target.iabPurposes.length > 0) ||
		(target.iabLegIntPurposes && target.iabLegIntPurposes.length > 0) ||
		(target.iabSpecialFeatures && target.iabSpecialFeatures.length > 0);

	if (snapshot.model === 'iab' && hasIABFields) {
		const iab = snapshot.iab;
		if (!iab) return false;
		return hasIABConsent(target, iab);
	}

	return has(target.category, snapshot.consents as ConsentState, {
		policyCategories:
			snapshot.policyCategories.length > 0
				? Array.from(snapshot.policyCategories)
				: null,
		policyScopeMode: snapshot.policyScopeMode,
	});
}

/**
 * Convenience for modules that only need the IAB-specific read, given
 * the full kernel snapshot. Returns `false` when IAB isn't populated.
 */
export function snapshotHasIABConsent(
	target: IABTarget,
	iab: KernelIABState | null
): boolean {
	if (!iab) return false;
	return hasIABConsent(target, iab);
}
