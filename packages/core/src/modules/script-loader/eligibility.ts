/**
 * Eligibility evaluation.
 *
 * Pure functions: given a snapshot (or a normalized script + a
 * `ReconcilePass`), decide whether the script is allowed to mount.
 *
 * The pass shape is built once per reconcile and shared across every
 * script in that reconcile.
 */

import type { ConsentSnapshot } from '../../types';
import { evaluateConsent, getEffectiveGateState, has } from '../has';
import type { NormalizedScript, ReconcilePass } from './types';

/**
 * Build the per-pass eligibility context from a snapshot. The kernel snapshot
 * already contains policy-effective consents, so modules must not re-apply
 * policy scope here.
 */
export const buildReconcilePass = function buildReconcilePass(
	snapshot: ConsentSnapshot
): ReconcilePass {
	return {
		consents: getEffectiveGateState(snapshot).effectivePermissions,
		iab: snapshot.iab,
		isIabMode: snapshot.model === 'iab',
		snapshot,
	};
};

/**
 * Evaluate the script's consent condition without applying `alwaysLoad`.
 * Always-loaded scripts still need the real result for their lifecycle
 * callbacks so consent-aware SDKs can switch tracking on and off.
 */
export const hasScriptConsent = function hasScriptConsent(
	entry: NormalizedScript,
	pass: ReconcilePass
): boolean {
	const { script } = entry;

	if (entry.hasIabMeta) {
		return evaluateConsent(script, pass.snapshot);
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
};

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
export const isEligible = function isEligible(
	entry: NormalizedScript,
	pass: ReconcilePass
): boolean {
	const { script } = entry;
	if (script.alwaysLoad) {
		return true;
	}

	return hasScriptConsent(entry, pass);
};
