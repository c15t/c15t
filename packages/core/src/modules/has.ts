/**
 * Pure category and IAB gate evaluation. Optional IAB code validates TC
 * receipts before installing authority; ordinary gates never load a codec.
 */

import { evaluateConsentRecord } from '../consent-record/evaluate';
import type { AllConsentNames } from '../consent/consent-types';
import { extractConsentNamesFromCondition, has } from '../libs/has';
import type { HasCondition } from '../libs/has';
import type { ConsentSnapshot, KernelIABState } from '../types';

export type { HasCondition };
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
 * require the declared legal bases:
 * - Require vendor consent for consent purposes and vendor LI for LI purposes.
 * - If `iabPurposes` set, require ALL of them in `purposeConsents`.
 * - If `iabLegIntPurposes` set, require ALL in `purposeLegitimateInterests`.
 * - If `iabSpecialFeatures` set, require ALL in `specialFeatureOptIns`.
 *
 * Missing IAB fields are vacuously true — an empty IAB target passes.
 */
export const hasIABConsent = function hasIABConsent(
	target: IABTarget,
	iab: IABConsentInputs
): boolean {
	if (target.vendorId !== undefined) {
		const key = String(target.vendorId);
		const needsLI = (target.iabLegIntPurposes?.length ?? 0) > 0;
		const needsConsent = !needsLI || (target.iabPurposes?.length ?? 0) > 0;
		if (
			needsLI &&
			(!Object.hasOwn(iab.vendorLegitimateInterests, key) ||
				iab.vendorLegitimateInterests[key] !== true)
		) {
			return false;
		}
		if (
			needsConsent &&
			(!Object.hasOwn(iab.vendorConsents, key) ||
				iab.vendorConsents[key] !== true)
		) {
			return false;
		}
	}
	return (
		(target.iabPurposes ?? []).every(
			(id) =>
				Object.hasOwn(iab.purposeConsents, id) &&
				iab.purposeConsents[id] === true
		) &&
		(target.iabLegIntPurposes ?? []).every(
			(id) =>
				Object.hasOwn(iab.purposeLegitimateInterests, id) &&
				iab.purposeLegitimateInterests[id] === true
		) &&
		(target.iabSpecialFeatures ?? []).every(
			(id) =>
				Object.hasOwn(iab.specialFeatureOptIns, id) &&
				iab.specialFeatureOptIns[id] === true
		)
	);
};

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
 * Reads permissions at the gate's clock without changing the kernel.
 * Reuses evaluated fields until the next semantic deadline.
 * @param snapshot - Immutable kernel snapshot.
 * @param now - Current epoch milliseconds.
 * @returns Effective category permissions and independent restrictions.
 */
export const getEffectiveGateState = function getEffectiveGateState(
	snapshot: ConsentSnapshot,
	now = Date.now()
): Pick<ConsentSnapshot, 'effectivePermissions' | 'restrictions'> {
	if (snapshot.nextDeadline === null || now < snapshot.nextDeadline) {
		return snapshot;
	}
	const evaluation = evaluateConsentRecord({
		choice: snapshot.explicitChoice,
		gpc: snapshot.privacySignals.gpc.active,
		noticeDismissal: snapshot.noticeDismissal,
		now,
		optOuts: snapshot.optOutDirectives,
		policy: snapshot.evaluationPolicy,
	});
	return {
		effectivePermissions: evaluation.permissions,
		restrictions: evaluation.restrictions,
	};
};

const hasCurrentIABAuthority = function hasCurrentIABAuthority(
	snapshot: ConsentSnapshot,
	now: number
): boolean {
	const { iab } = snapshot;
	const authority = iab?.authority;
	if (
		!iab?.enabled ||
		!authority ||
		snapshot.resolution.status !== 'matched' ||
		authority.choiceFingerprint !==
			snapshot.evaluationPolicy.choice.fingerprint ||
		!authority.tcString ||
		!Number.isSafeInteger(authority.confirmedAt) ||
		!Number.isSafeInteger(authority.expiresAt) ||
		authority.confirmedAt < 0 ||
		authority.confirmedAt > now ||
		authority.expiresAt <= now ||
		authority.expiresAt <= authority.confirmedAt
	) {
		return false;
	}
	return true;
};

/**
 * Evaluates a target using current effective permissions or confirmed TC authority.
 * IAB targets also apply every referenced category restriction, including in OR trees.
 * @param target - Category condition and optional IAB metadata.
 * @param snapshot - Immutable kernel snapshot.
 * @param now - Gate clock in epoch milliseconds.
 * @returns Whether the target may run at this time.
 */
export const evaluateConsent = function evaluateConsent<
	CategoryType extends AllConsentNames,
>(
	target: ConsentGate<CategoryType>,
	snapshot: ConsentSnapshot,
	now = Date.now()
): boolean {
	const effective = getEffectiveGateState(snapshot, now);
	const hasIABFields =
		target.vendorId !== undefined ||
		target.iabPurposes?.length ||
		target.iabLegIntPurposes?.length ||
		target.iabSpecialFeatures?.length;

	if (hasIABFields) {
		if (snapshot.model !== 'iab') {
			return false;
		}
		const { iab } = snapshot;
		const authority = iab?.authority;
		if (!authority || !hasCurrentIABAuthority(snapshot, now)) {
			return false;
		}
		for (const category of extractConsentNamesFromCondition<AllConsentNames>(
			target.category
		)) {
			if (
				category !== 'necessary' &&
				effective.restrictions[category]?.length
			) {
				return false;
			}
		}
		return hasIABConsent(target, authority);
	}

	return has(target.category, effective.effectivePermissions);
};

/**
 * Convenience for modules that only need the IAB-specific read, given
 * the full kernel snapshot. Returns `false` when IAB isn't populated.
 */
export const snapshotHasIABConsent = function snapshotHasIABConsent(
	target: IABTarget,
	iab: KernelIABState | null
): boolean {
	if (
		!iab?.enabled ||
		!iab.authority ||
		Date.now() >= iab.authority.expiresAt
	) {
		return false;
	}
	return hasIABConsent(target, iab.authority);
};
