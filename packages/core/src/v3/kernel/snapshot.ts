/**
 * Snapshot construction and freezing.
 *
 * Pure: no DOM, no window, no network, no closure capture. Every helper
 * here takes plain data in and returns plain data out. The kernel index
 * holds the mutable `let snapshot` cell; this file only produces values.
 */

import { allConsentNames } from '../../types/consent-types';
import { applyPolicyToConsents, deriveActiveUI, deriveModel } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	KernelConfig,
	KernelIABState,
} from '../types';

/**
 * Default consent state. `necessary` is always granted (legal floor);
 * everything else starts denied so kernels are safe before init runs.
 */
export const DEFAULT_CONSENTS: ConsentState = {
	necessary: true,
	functionality: false,
	marketing: false,
	measurement: false,
	experience: false,
};

/**
 * Default IAB slice. Used as the base when constructing the initial IAB
 * state and when folding partial IAB patches onto a previously-null slice.
 */
export const DEFAULT_IAB: KernelIABState = {
	enabled: false,
	gvl: null,
	customVendors: [],
	cmpId: null,
	vendorConsents: {},
	vendorLegitimateInterests: {},
	purposeConsents: {},
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	tcString: null,
};

/**
 * Merge user-supplied initial consents over the default consent state.
 *
 * Only boolean values for known category names are accepted; anything
 * else is dropped silently. This guards against config typos surfacing
 * later as runtime gating bugs.
 */
export function buildInitialConsents(
	initial: Partial<ConsentState> | undefined
): ConsentState {
	if (!initial) {
		return { ...DEFAULT_CONSENTS };
	}
	const merged: ConsentState = { ...DEFAULT_CONSENTS };
	for (const name of allConsentNames) {
		if (name in initial && typeof initial[name] === 'boolean') {
			merged[name] = initial[name] as boolean;
		}
	}
	return merged;
}

/**
 * Merge a user-supplied initial IAB slice over the IAB defaults.
 *
 * Returns `null` when no IAB seed was provided — the IAB slice on the
 * snapshot is `null`-by-default so consumers can detect "IAB not in play"
 * without checking `enabled`.
 */
export function buildInitialIab(
	initial: Partial<KernelIABState> | undefined
): KernelIABState | null {
	if (!initial) return null;
	return {
		...DEFAULT_IAB,
		...initial,
	};
}

/**
 * Deep-freeze a snapshot in place and return it typed as `ConsentSnapshot`.
 *
 * Every nested object on the snapshot is frozen so subscribers can do
 * `===` reference checks at any depth and trust that the value won't
 * mutate underneath them. Frozen primitives are no-ops.
 *
 * Mutates the input object (freezes it) but returns the same reference.
 */
export function freezeSnapshot(snapshot: ConsentSnapshot): ConsentSnapshot {
	Object.freeze(snapshot.consents);
	Object.freeze(snapshot.overrides);
	if (snapshot.user) Object.freeze(snapshot.user);
	if (snapshot.translations) Object.freeze(snapshot.translations);
	if (snapshot.policy) Object.freeze(snapshot.policy);
	if (snapshot.policyDecision) Object.freeze(snapshot.policyDecision);
	if (snapshot.policyBanner) Object.freeze(snapshot.policyBanner);
	if (snapshot.policyDialog) Object.freeze(snapshot.policyDialog);
	if (snapshot.iab) Object.freeze(snapshot.iab);
	if (snapshot.location) Object.freeze(snapshot.location);
	Object.freeze(snapshot.policyCategories);
	return Object.freeze(snapshot) as ConsentSnapshot;
}

/**
 * Build the initial frozen snapshot from a kernel config.
 *
 * Steps:
 * 1. Materialize the IAB slice from `config.initialIab` (or `null`).
 * 2. Materialize the resolved policy from `config.initialPolicy`.
 * 3. Run policy derivations once so `model`, `activeUI`,
 *    `policyCategories`, and `policyScopeMode` are populated up-front.
 *    Without this an SSR consumer would see `null` model on the very
 *    first render before init resolves.
 * 4. Freeze and return.
 *
 * Pure — no side effects. Returns a snapshot at revision 0.
 */
export function buildInitialSnapshot(config: KernelConfig): ConsentSnapshot {
	const initialIab = buildInitialIab(config.initialIab);
	const initialPolicy = config.initialPolicy
		? { ...config.initialPolicy }
		: null;
	const initialModel = deriveModel(initialPolicy, initialIab?.enabled ?? false);
	const initialPolicyResult = applyPolicyToConsents({
		consents: buildInitialConsents(config.initialConsents),
		hasConsented: false,
		policy: initialPolicy,
	});

	return freezeSnapshot({
		consents: initialPolicyResult.consents,
		overrides: { ...(config.initialOverrides ?? {}) },
		user: config.initialUser ? { ...config.initialUser } : null,
		subjectId: config.initialSubjectId ?? null,
		hasConsented: false,
		revision: 0,
		location: config.initialLocation ? { ...config.initialLocation } : null,
		translations: config.initialTranslations
			? { ...config.initialTranslations }
			: null,
		branding: config.initialBranding ?? null,
		policy: initialPolicy,
		policyDecision: config.initialPolicyDecision
			? { ...config.initialPolicyDecision }
			: null,
		policySnapshotToken: config.initialPolicySnapshotToken ?? null,
		model: initialModel,
		activeUI: deriveActiveUI(initialModel, initialPolicy),
		policyCategories: initialPolicyResult.policyCategories,
		policyScopeMode: initialPolicyResult.policyScopeMode,
		policyBanner: config.initialPolicy?.ui?.banner
			? { ...config.initialPolicy.ui.banner }
			: null,
		policyDialog: config.initialPolicy?.ui?.dialog
			? { ...config.initialPolicy.ui.dialog }
			: null,
		iab: initialIab,
	});
}
