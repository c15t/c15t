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
import type { AllConsentNames } from '../../types/consent-types';
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
export function applyPatch(
	current: ConsentSnapshot,
	patch: SnapshotPatch
): ConsentSnapshot {
	return freezeSnapshot({
		consents: patch.consents ?? current.consents,
		overrides: patch.overrides ?? current.overrides,
		user: patch.user === undefined ? current.user : patch.user,
		subjectId:
			patch.subjectId === undefined ? current.subjectId : patch.subjectId,
		hasConsented: patch.hasConsented ?? current.hasConsented,
		revision: current.revision + 1,
		location: patch.location === undefined ? current.location : patch.location,
		translations:
			patch.translations === undefined
				? current.translations
				: patch.translations,
		branding: patch.branding === undefined ? current.branding : patch.branding,
		policy: patch.policy === undefined ? current.policy : patch.policy,
		policyDecision:
			patch.policyDecision === undefined
				? current.policyDecision
				: patch.policyDecision,
		policySnapshotToken:
			patch.policySnapshotToken === undefined
				? current.policySnapshotToken
				: patch.policySnapshotToken,
		model: patch.model === undefined ? current.model : patch.model,
		activeUI: patch.activeUI === undefined ? current.activeUI : patch.activeUI,
		policyCategories:
			patch.policyCategories === undefined
				? current.policyCategories
				: patch.policyCategories,
		policyScopeMode:
			patch.policyScopeMode === undefined
				? current.policyScopeMode
				: patch.policyScopeMode,
		policyBanner:
			patch.policyBanner === undefined
				? current.policyBanner
				: patch.policyBanner,
		policyDialog:
			patch.policyDialog === undefined
				? current.policyDialog
				: patch.policyDialog,
		iab: patch.iab === undefined ? current.iab : patch.iab,
	});
}
