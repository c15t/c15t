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
import type { Translations } from '@c15t/translations';
import { deepMergeTranslations } from '@c15t/translations';

import { allConsentNames } from '../consent/consent-types';
import { applyPolicyToConsents, deriveActiveUI, deriveModel } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	InitResponse,
	KernelIABState,
	KernelTranslations,
} from '../types';
import type { SnapshotPatch } from './patch';
import { DEFAULT_IAB } from './snapshot';

/**
 * Merge incoming init translations over the snapshot's current ones.
 *
 * Transports built on the shared resolver deliver complete per-language
 * sets, but custom transports and hand-rolled fixtures can send partial
 * payloads. Wholesale replacement would silently blank every omitted key
 * (e.g. `common.securedBy` disappearing from the branding tag), so when
 * the language matches we deep-merge the response over the current copy —
 * complete responses win per-key and omissions keep their current value.
 * A language switch replaces outright: mixing languages is worse than
 * trusting the transport.
 */
const mergeInitTranslations = function mergeInitTranslations(
	current: Readonly<KernelTranslations> | null,
	incoming: KernelTranslations
): KernelTranslations {
	if (
		!current?.translations ||
		!incoming?.translations ||
		current.language !== incoming.language
	) {
		return incoming;
	}
	return {
		...incoming,
		translations: deepMergeTranslations(
			current.translations as Translations,
			incoming.translations as Partial<Translations>
		) as KernelTranslations['translations'],
	};
};

/**
 * Build a `SnapshotPatch` from an init response. Returns `null` if the
 * response carries no fields that would change the snapshot.
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const applyInitResponse = function applyInitResponse(
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
		patch.translations = response.translations
			? mergeInitTranslations(current.translations, response.translations)
			: response.translations;
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
			cmpId: response.cmpId === undefined ? baseline.cmpId : response.cmpId,
			customVendors:
				response.customVendors === undefined
					? baseline.customVendors
					: response.customVendors,
			gvl: response.gvl === undefined ? baseline.gvl : response.gvl,
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
		if (changed) {
			patch.consents = nextConsents;
		}
	}
	if (response.hasConsented !== undefined) {
		patch.hasConsented = response.hasConsented;
	}
	if (response.subjectId !== undefined) {
		patch.subjectId = response.subjectId;
	}

	// If nothing in the response touched the snapshot, return null so the
	// caller can skip notifying subscribers and emitting `init:applied` —
	// unless the current policy is provisional: init completing (even with
	// an empty response) finalizes the placeholder so `activeUI` can be
	// derived and surfaces may render.
	if (Object.keys(patch).length === 0 && !current.policyProvisional) {
		return null;
	}
	if (current.policyProvisional) {
		patch.policyProvisional = false;
	}

	// Derive model / activeUI / policy-filtered categories AFTER the
	// input fields are resolved. Policy derivations depend on the final
	// effective policy + iab.enabled, so compute them last.
	const effectivePolicy =
		patch.policy === undefined ? current.policy : patch.policy;
	const effectiveOverrides =
		patch.overrides === undefined ? current.overrides : patch.overrides;
	const effectiveIabEnabled =
		(patch.iab === undefined ? current.iab : patch.iab)?.enabled ?? false;

	const hasConsentedForPolicy =
		patch.hasConsented === undefined
			? current.hasConsented
			: patch.hasConsented;
	const nextModel = deriveModel(effectivePolicy, effectiveIabEnabled);
	patch.model = nextModel;
	patch.activeUI = hasConsentedForPolicy
		? 'none'
		: deriveActiveUI(nextModel, effectivePolicy);

	const consentsForPolicy =
		patch.consents === undefined ? current.consents : patch.consents;
	const policyResult = applyPolicyToConsents({
		consents: consentsForPolicy,
		gpc: effectiveOverrides.gpc,
		hasConsented: hasConsentedForPolicy,
		policy: effectivePolicy,
	});
	patch.consents = policyResult.consents;
	patch.policyCategories = policyResult.policyCategories;
	patch.policyScopeMode = policyResult.policyScopeMode;

	return patch;
};
