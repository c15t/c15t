/**
 * Snapshot patching.
 *
 * The kernel exposes mutation through partial patches: callers describe
 * which fields change, and `advance()` produces the next frozen snapshot
 * with `revision` bumped by 1.
 *
 * Pure: takes the current snapshot + a patch, returns the next snapshot.
 * Does not notify subscribers — the caller (kernel index) is responsible
 * for calling listeners. This split keeps state notification orthogonal
 * to state derivation, so tests can exercise the data flow without
 * touching the listener set.
 */
import type {
	LocationResponse,
	PolicyDecision,
	PolicyScopeMode,
	ResolvedPolicy,
} from '@c15t/schema/types';

import type { AllConsentNames } from '../consent/consent-types';
import type {
	ConsentSnapshot,
	ConsentState,
	KernelActiveUI,
	KernelBranding,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelTranslations,
	KernelUser,
} from '../types';
import { freezeSnapshot } from './snapshot';

/**
 * Partial update applied to a snapshot.
 *
 * Semantics for nullable fields (`user`, `subjectId`, `location`,
 * `translations`, `branding`, `policy`, `policyDecision`,
 * `policySnapshotToken`, `policyBanner`, `policyDialog`, `iab`):
 * - `undefined` (omitted) — preserve the current value.
 * - `null` — explicitly clear the field.
 *
 * Non-nullable fields (`consents`, `overrides`, `hasConsented`, `model`,
 * `activeUI`, `policyCategories`, `policyScopeMode`) only support
 * `undefined` (preserve) and a concrete value (replace).
 */
export interface SnapshotPatch {
	consents?: ConsentState;
	overrides?: KernelOverrides;
	user?: KernelUser | null;
	subjectId?: string | null;
	hasConsented?: boolean;
	location?: LocationResponse | null;
	translations?: KernelTranslations | null;
	branding?: KernelBranding | null;
	policy?: ResolvedPolicy | null;
	policyDecision?: PolicyDecision | null;
	policySnapshotToken?: string | null;
	model?: KernelModel;
	activeUI?: KernelActiveUI;
	policyProvisional?: boolean;
	policyCategories?: AllConsentNames[];
	policyScopeMode?: PolicyScopeMode;
	policyBanner?: ConsentSnapshot['policyBanner'];
	policyDialog?: ConsentSnapshot['policyDialog'];
	iab?: KernelIABState | null;
}

/**
 * Produce the next snapshot by applying a patch to the current snapshot.
 *
 * Increments `revision` by 1 and returns a frozen result. The current
 * snapshot is not mutated. The caller is responsible for swapping in the
 * returned snapshot and notifying subscribers.
 */
export const applyPatch = function applyPatch(
	current: ConsentSnapshot,
	patch: SnapshotPatch
): ConsentSnapshot {
	return freezeSnapshot({
		activeUI: patch.activeUI === undefined ? current.activeUI : patch.activeUI,
		branding: patch.branding === undefined ? current.branding : patch.branding,
		consents: patch.consents ?? current.consents,
		hasConsented: patch.hasConsented ?? current.hasConsented,
		iab: patch.iab === undefined ? current.iab : patch.iab,
		location: patch.location === undefined ? current.location : patch.location,
		model: patch.model === undefined ? current.model : patch.model,
		overrides: patch.overrides ?? current.overrides,
		policy: patch.policy === undefined ? current.policy : patch.policy,
		policyBanner:
			patch.policyBanner === undefined
				? current.policyBanner
				: patch.policyBanner,
		policyCategories:
			patch.policyCategories === undefined
				? current.policyCategories
				: patch.policyCategories,
		policyDecision:
			patch.policyDecision === undefined
				? current.policyDecision
				: patch.policyDecision,
		policyDialog:
			patch.policyDialog === undefined
				? current.policyDialog
				: patch.policyDialog,
		policyProvisional: patch.policyProvisional ?? current.policyProvisional,
		policyScopeMode:
			patch.policyScopeMode === undefined
				? current.policyScopeMode
				: patch.policyScopeMode,
		policySnapshotToken:
			patch.policySnapshotToken === undefined
				? current.policySnapshotToken
				: patch.policySnapshotToken,
		revision: current.revision + 1,
		subjectId:
			patch.subjectId === undefined ? current.subjectId : patch.subjectId,
		translations:
			patch.translations === undefined
				? current.translations
				: patch.translations,
		user: patch.user === undefined ? current.user : patch.user,
	});
};
