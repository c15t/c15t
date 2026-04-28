/**
 * Fold an `InitResponse` from a transport onto a snapshot.
 *
 * Pure: takes the current snapshot + the response, returns a patch the
 * caller can hand to `advance()`. Returns `null` when the response would
 * be a no-op so the caller can skip notifying subscribers entirely.
 *
 * Field order matters: model/activeUI/policyCategories/policyScopeMode
 * are derived AFTER all input fields are merged so they reflect the
 * effective post-patch policy + IAB enablement, not the pre-patch state.
 */
import { allConsentNames } from '../../types/consent-types';
import { applyPolicyToConsents, deriveActiveUI, deriveModel } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	InitResponse,
	KernelIABState,
} from '../types';
import type { SnapshotPatch } from './patch';
import { DEFAULT_IAB } from './snapshot';

/**
 * Build a `SnapshotPatch` from an init response. Returns `null` if the
 * response carries no fields that would change the snapshot.
 */
export function applyInitResponse(
	current: ConsentSnapshot,
	response: InitResponse
): SnapshotPatch | null {
	const patch: SnapshotPatch = {};

	if (response.resolvedOverrides) {
		patch.overrides = {
			...current.overrides,
			...response.resolvedOverrides,
		};
	}
	if (response.location !== undefined) {
		patch.location = response.location;
	}
	if (response.translations !== undefined) {
		patch.translations = response.translations;
	}
	if (response.branding !== undefined) {
		patch.branding = response.branding;
	}
	if (response.policy !== undefined) {
		patch.policy = response.policy;
		patch.policyBanner = response.policy.ui?.banner ?? null;
		patch.policyDialog = response.policy.ui?.dialog ?? null;
	}
	if (response.policyDecision !== undefined) {
		patch.policyDecision = response.policyDecision;
	}
	if (response.policySnapshotToken !== undefined) {
		patch.policySnapshotToken = response.policySnapshotToken;
	}

	// IAB passthrough: fold gvl / customVendors / cmpId into the iab
	// slice. The IAB module decides whether to enable itself based on
	// the presence of a GVL.
	if (
		response.gvl !== undefined ||
		response.customVendors !== undefined ||
		response.cmpId !== undefined
	) {
		const baseline = current.iab ?? DEFAULT_IAB;
		const nextIab: KernelIABState = {
			...baseline,
			gvl: response.gvl !== undefined ? response.gvl : baseline.gvl,
			customVendors:
				response.customVendors !== undefined
					? response.customVendors
					: baseline.customVendors,
			cmpId: response.cmpId !== undefined ? response.cmpId : baseline.cmpId,
		};
		// Server explicitly returned `gvl: null` → IAB disabled for this
		// request (non-IAB region on a 200 response).
		if (response.gvl === null) {
			nextIab.enabled = false;
		}
		patch.iab = nextIab;
	}

	// Merge server-side consent state with current consents.
	if (response.consents) {
		const nextConsents: ConsentState = { ...current.consents };
		let changed = false;
		for (const name of allConsentNames) {
			if (
				name in response.consents &&
				typeof response.consents[name] === 'boolean' &&
				nextConsents[name] !== response.consents[name]
			) {
				nextConsents[name] = response.consents[name] as boolean;
				changed = true;
			}
		}
		if (changed) patch.consents = nextConsents;
	}
	if (response.hasConsented !== undefined) {
		patch.hasConsented = response.hasConsented;
	}

	// If nothing in the response touched the snapshot, return null so the
	// caller can skip notifying subscribers and emitting `init:applied`.
	if (Object.keys(patch).length === 0) {
		return null;
	}

	// Derive model / activeUI / policy-filtered categories AFTER the
	// input fields are resolved. Policy derivations depend on the final
	// effective policy + iab.enabled, so compute them last.
	const effectivePolicy =
		patch.policy !== undefined ? patch.policy : current.policy;
	const effectiveIabEnabled =
		(patch.iab !== undefined ? patch.iab : current.iab)?.enabled ?? false;

	const nextModel = deriveModel(effectivePolicy, effectiveIabEnabled);
	patch.model = nextModel;
	patch.activeUI = deriveActiveUI(nextModel, effectivePolicy);

	const consentsForPolicy =
		patch.consents !== undefined ? patch.consents : current.consents;
	const hasConsentedForPolicy =
		patch.hasConsented !== undefined
			? patch.hasConsented
			: current.hasConsented;
	const policyResult = applyPolicyToConsents({
		consents: consentsForPolicy,
		hasConsented: hasConsentedForPolicy,
		policy: effectivePolicy,
	});
	patch.consents = policyResult.consents;
	patch.policyCategories = policyResult.policyCategories;
	patch.policyScopeMode = policyResult.policyScopeMode;

	return patch;
}
