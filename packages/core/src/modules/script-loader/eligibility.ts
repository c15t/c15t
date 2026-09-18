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
	const denied = snapshot.vendorChoice?.denied;
	return {
		consents: getEffectiveGateState(snapshot).effectivePermissions,
		iab: snapshot.iab,
		isIabMode: snapshot.model === 'iab',
		snapshot,
		vendorDenied: denied && denied.length > 0 ? new Set(denied) : null,
	};
};

/** Whether the pass denies this script's vendor. Inert in IAB mode. */
const vendorAllowed = function vendorAllowed(
	entry: NormalizedScript,
	pass: ReconcilePass
): boolean {
	return (
		entry.vendor === null ||
		pass.isIabMode ||
		pass.vendorDenied === null ||
		!pass.vendorDenied.has(entry.vendor)
	);
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
		return (
			(pass.consents[entry.simpleCategory] || false) &&
			vendorAllowed(entry, pass)
		);
	}

	return has(script.category, pass.consents) && vendorAllowed(entry, pass);
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
 * 5. Outside IAB mode, a script whose `vendor` the subject turned off is
 *    denied even when its category passes.
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
