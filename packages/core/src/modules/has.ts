/**
 * Pure category and IAB gate evaluation. Optional IAB code validates TC
 * receipts before installing authority; ordinary gates never load a codec.
 */

import { evaluateConsentRecord } from '../consent-record/evaluate';
import type { AllConsentNames } from '../consent/consent-types';
import { extractConsentNamesFromCondition, has } from '../libs/has';
import type { HasCondition } from '../libs/has';
import type { PublisherRestriction } from '../options/iab-tcf';
import type { ConsentSnapshot } from '../types';

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
	/** Publisher restrictions from the confirmed TC string. */
	publisherRestrictions?: readonly PublisherRestriction[];
}

/**
 * The part of a vendor's Global Vendor List entry that publisher
 * restrictions depend on.
 */
export interface IABVendorDeclaration {
	/** Purposes the vendor accepts on either legal basis. */
	flexiblePurposes?: readonly number[];
}

/**
 * The vendor list ID a target names, or `null`. Only the canonical form
 * counts: a positive integer, or its decimal string with no sign, spaces,
 * leading zeros or exponent. A custom vendor such as `"0755"` is not
 * registered vendor 755, so its restrictions do not apply.
 */
const registeredVendorId = function registeredVendorId(
	vendorId: IABTarget['vendorId']
): number | null {
	const id = Number(vendorId);
	return Number.isSafeInteger(id) && id > 0 && String(id) === String(vendorId)
		? id
		: null;
};

/** Purposes TCF allows only with consent (policy version 4 and later). */
const CONSENT_ONLY_PURPOSES = new Set([1, 3, 4, 5, 6]);

interface LegalBases {
	consent: number[];
	legitimateInterest: number[];
}

/**
 * Applies publisher restrictions to the purposes a target declares.
 * Returns `null` when a restriction forbids the processing.
 */
const restrictLegalBases = function restrictLegalBases(
	target: IABTarget,
	restrictions: readonly PublisherRestriction[] | undefined,
	declaration: IABVendorDeclaration | undefined
): LegalBases | null {
	const consent = [...(target.iabPurposes ?? [])];
	const legitimateInterest = [...(target.iabLegIntPurposes ?? [])];
	const vendorId = registeredVendorId(target.vendorId);
	if (vendorId === null || !restrictions?.length) {
		return { consent, legitimateInterest };
	}
	const typeFor = (purposeId: number): number | undefined => {
		let type: number | undefined;
		for (const restriction of restrictions) {
			if (
				restriction.purposeId === purposeId &&
				restriction.vendorIds.includes(vendorId)
			) {
				// Contradicting restrictions leave no legal basis.
				type =
					type === undefined || type === restriction.restrictionType
						? restriction.restrictionType
						: 0;
			}
		}
		return type;
	};
	const flexible = (purposeId: number) =>
		declaration?.flexiblePurposes?.includes(purposeId) === true;
	const bases: LegalBases = { consent: [], legitimateInterest: [] };
	for (const purposeId of consent) {
		const type = typeFor(purposeId);
		if (type === 0) {
			return null;
		}
		if (type === 2) {
			if (!flexible(purposeId) || CONSENT_ONLY_PURPOSES.has(purposeId)) {
				return null;
			}
			bases.legitimateInterest.push(purposeId);
		} else {
			bases.consent.push(purposeId);
		}
	}
	for (const purposeId of legitimateInterest) {
		const type = typeFor(purposeId);
		if (type === 0) {
			return null;
		}
		if (type === 1) {
			if (!flexible(purposeId)) {
				return null;
			}
			bases.consent.push(purposeId);
		} else {
			bases.legitimateInterest.push(purposeId);
		}
	}
	return bases;
};

/**
 * Whether a target processes on legitimate interest alone once publisher
 * restrictions apply. TCF needs no consent for that processing; the
 * visitor's control is the objection, which the vendor-level check reads.
 * A refused category therefore does not block such a target. Other
 * category restrictions (GPC, strict scope) still do,
 * and the category itself is never granted.
 */
const usesOnlyLegitimateInterest = function usesOnlyLegitimateInterest(
	target: IABTarget,
	restrictions: readonly PublisherRestriction[] | undefined,
	declaration: IABVendorDeclaration | undefined
): boolean {
	const bases = restrictLegalBases(target, restrictions, declaration);
	return (
		bases !== null &&
		bases.consent.length === 0 &&
		bases.legitimateInterest.length > 0 &&
		!target.iabSpecialFeatures?.length
	);
};

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
 * Publisher restrictions for the target's `vendorId` apply first:
 * - Type 0 denies a target that declares the purpose on either basis.
 * - Type 1 moves an LI purpose to consent; type 2 moves a consent purpose
 *   to LI. The move needs the purpose in the vendor's `flexiblePurposes`,
 *   and type 2 never applies to purposes 1 and 3 to 6. Otherwise the
 *   target is denied, because the vendor has no permitted legal basis.
 *
 * Missing IAB fields are vacuously true — an empty IAB target passes.
 *
 * @param target - IAB metadata of the script, rule or iframe.
 * @param iab - Confirmed IAB signals and publisher restrictions.
 * @param declaration - The target vendor's vendor list entry, if any.
 * @returns Whether the target may run.
 */
export const hasIABConsent = function hasIABConsent(
	target: IABTarget,
	iab: IABConsentInputs,
	declaration?: IABVendorDeclaration
): boolean {
	const bases = restrictLegalBases(
		target,
		iab.publisherRestrictions,
		declaration
	);
	if (!bases) {
		return false;
	}
	if (target.vendorId !== undefined) {
		const key = String(target.vendorId);
		const needsLI = bases.legitimateInterest.length > 0;
		const needsConsent = !needsLI || bases.consent.length > 0;
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
		bases.consent.every(
			(id) =>
				Object.hasOwn(iab.purposeConsents, id) &&
				iab.purposeConsents[id] === true
		) &&
		bases.legitimateInterest.every(
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
 * category condition (always required), optional IAB metadata and an
 * optional vendor slug for vendor-level consent outside IAB.
 */
export interface ConsentGate<
	CategoryType extends AllConsentNames = AllConsentNames,
> extends IABTarget {
	category: HasCondition<CategoryType>;
	/**
	 * Vendor slug the target belongs to. Outside `model === 'iab'` the target
	 * is denied while the subject has this vendor turned off. Inert in IAB
	 * mode, where vendor consent comes from the TC string.
	 */
	vendor?: string;
}

/**
 * Ids the subject turned off that a gate should honor, or `null` when
 * nothing is denied. Only a vendor currently declared and not `disabled`
 * counts: for anything else the visitor has no switch to grant it again, so
 * a denial recorded earlier would block it with no way back short of a bulk
 * action. A vendor removed from every declaration therefore follows its
 * category again, the same as one never declared.
 * @param snapshot - Immutable kernel snapshot.
 * @returns Denied vendor ids, or `null`.
 */
export const deniedVendorIds = function deniedVendorIds(
	snapshot: Pick<ConsentSnapshot, 'vendorChoice' | 'vendors'>
): ReadonlySet<string> | null {
	const denied = snapshot.vendorChoice?.denied;
	if (!denied || denied.length === 0) {
		return null;
	}
	const toggleable = new Set<string>();
	for (const vendor of snapshot.vendors?.declared ?? []) {
		if (vendor.disabled !== true) {
			toggleable.add(vendor.id);
		}
	}
	const ids = new Set<string>();
	for (const id of denied) {
		if (toggleable.has(id)) {
			ids.add(id);
		}
	}
	return ids.size > 0 ? ids : null;
};

/**
 * Whether the subject turned a vendor off. Unknown ids are granted: a
 * denial only counts for a vendor the subject can still see and switch.
 * @param snapshot - Immutable kernel snapshot.
 * @param vendor - Vendor slug.
 * @returns `true` while the vendor is denied.
 */
export const isVendorDenied = function isVendorDenied(
	snapshot: Pick<ConsentSnapshot, 'vendorChoice' | 'vendors'>,
	vendor: string
): boolean {
	return deniedVendorIds(snapshot)?.has(vendor) ?? false;
};

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
		exemptionPreferences: snapshot.exemptionPreferences,
		gpc: snapshot.privacySignals.gpc.active,
		noticeDismissal: snapshot.noticeDismissal,
		now,
		policy: snapshot.evaluationPolicy,
	});
	return {
		effectivePermissions: evaluation.permissions,
		restrictions: evaluation.restrictions,
	};
};

/** The target vendor's entry in the loaded vendor list, if any. */
const vendorDeclaration = function vendorDeclaration(
	snapshot: ConsentSnapshot,
	vendorId: IABTarget['vendorId']
): IABVendorDeclaration | undefined {
	const vendors = snapshot.iab?.gvl?.vendors;
	const key = String(vendorId);
	return vendorId !== undefined && vendors && Object.hasOwn(vendors, key)
		? vendors[key]
		: undefined;
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
 * IAB targets also apply every referenced category restriction, including in OR trees,
 * except that a refused category does not block a target that uses legitimate
 * interest only after publisher restrictions (see `usesOnlyLegitimateInterest`).
 * Outside IAB mode a target whose `vendor` the subject turned off is denied
 * after its category condition passes, so an unknown category still throws.
 * @param target - Category condition, optional IAB metadata and optional vendor.
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
		const declaration = vendorDeclaration(snapshot, target.vendorId);
		const ignoreRefusal = usesOnlyLegitimateInterest(
			target,
			authority.publisherRestrictions,
			declaration
		);
		for (const category of extractConsentNamesFromCondition<AllConsentNames>(
			target.category
		)) {
			if (
				category !== 'necessary' &&
				effective.restrictions[category]?.some(
					(reason) => !(ignoreRefusal && reason === 'explicit-denial')
				)
			) {
				return false;
			}
		}
		return hasIABConsent(target, authority, declaration);
	}

	const allowed = has(target.category, effective.effectivePermissions);
	if (!allowed || target.vendor === undefined || snapshot.model === 'iab') {
		return allowed;
	}
	return !isVendorDenied(snapshot, target.vendor);
};
