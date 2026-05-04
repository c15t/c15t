/**
 * Eligibility evaluation.
 *
 * Pure functions: given a snapshot (or a normalized script + a
 * `ReconcilePass`), decide whether the script is allowed to mount.
 *
 * The pass shape is built once per reconcile and shared across every
 * script in that reconcile — this is the only place policy-scope
 * runtime gating is applied.
 */
import { applyPolicyScopeForRuntimeGating } from '../../../libs/policy';
import type { AllConsentNames } from '../../../types/consent-types';
import type { ConsentSnapshot, ConsentState } from '../../types';
import { has, hasIABConsent } from '../has';
import type { NormalizedScript, ReconcilePass } from './types';

/**
 * Build the per-pass eligibility context from a snapshot. Resolves
 * policy-scope gating (in `permissive` mode, out-of-policy categories
 * are forced to `true` so gating treats them as granted) and freezes
 * the `consents` reference for the rest of this reconcile.
 */
export function buildReconcilePass(snapshot: ConsentSnapshot): ReconcilePass {
	const policyCategories =
		snapshot.policyCategories.length > 0
			? (snapshot.policyCategories as AllConsentNames[])
			: null;
	const hasPolicyScope =
		snapshot.policyScopeMode !== 'strict' &&
		policyCategories !== null &&
		!policyCategories.includes('*' as AllConsentNames);
	const consents = hasPolicyScope
		? applyPolicyScopeForRuntimeGating(
				snapshot.consents as ConsentState,
				policyCategories,
				snapshot.policyScopeMode
			)
		: (snapshot.consents as ConsentState);

	return {
		snapshot,
		consents,
		isIabMode: snapshot.model === 'iab',
		iab: snapshot.iab,
	};
}

/**
 * Decide whether a normalized script should be mounted given the
 * current pass. Pure.
 *
 * Decision order:
 * 1. `alwaysLoad` short-circuits to `true` regardless of consent.
 * 2. In IAB mode, scripts with IAB metadata route through
 *    `hasIABConsent`. If IAB metadata is declared but no IAB slice
 *    exists, the script is denied.
 * 3. Scripts with a single-category string consult the consent record
 *    directly. An unknown category throws — config bug, not user data.
 * 4. Otherwise the category tree is evaluated through `has`.
 */
export function isEligible(
	entry: NormalizedScript,
	pass: ReconcilePass
): boolean {
	const { script } = entry;
	if (script.alwaysLoad) return true;

	if (pass.isIabMode && entry.hasIabMeta) {
		if (!pass.iab) return false;
		return hasIABConsent(script, pass.iab);
	}

	if (entry.simpleCategory) {
		if (!(entry.simpleCategory in pass.consents)) {
			throw new Error(
				`Consent category "${entry.simpleCategory}" not found in consent state`
			);
		}
		return pass.consents[entry.simpleCategory] || false;
	}

	return has(script.category, pass.consents);
}
