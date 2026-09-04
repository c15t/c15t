/**
 * Normalized consent-record contracts.
 *
 * These shapes are internal to the consent-record module while the
 * kernel integration is reviewed. Nothing here is re-exported from the
 * package entry yet. The semantics follow the #1025 decision review:
 * one latest decision per optional category, each carrying its own
 * confirmation time and policy-compatibility basis, with no history.
 *
 * @internal
 */

import type { CONSENT_CATEGORY } from './index';

/** Every category the runtime knows about, including `necessary`. */
export type ConsentCategory = CONSENT_CATEGORY;

/** Categories a subject can decide on. `necessary` is never a choice. */
export type OptionalConsentCategory = Exclude<ConsentCategory, 'necessary'>;

/** Ordered list of optional categories. Order is stable for hashing. */
export const OPTIONAL_CONSENT_CATEGORIES = [
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const satisfies readonly OptionalConsentCategory[];

/** Permission model the policy enforces. Notice is a prompt, not a model. */
export type PolicyModel = 'opt-in' | 'opt-out' | 'iab';

/** First-layer interaction the policy requires. */
export type PolicyPrompt = 'choice' | 'notice' | 'none';

/** Why a prompt is still required. */
export type PromptReason = 'missing' | 'expired' | 'policy-changed';

/**
 * Remaining required interaction after stored records were checked.
 * Describes what is still owed, not whether a dialog is open.
 */
export type PromptRequirement =
	| { kind: 'choice'; reason: PromptReason }
	| { kind: 'notice'; reason: PromptReason }
	| { kind: 'none' };

/**
 * Which policy contract a decision was confirmed against.
 *
 * - `choice-v1` binds to the versioned choice prompt fingerprint.
 * - `legacy-v2` comes from a v2 browser record. Its optional material
 *   fingerprint lives in the legacy hash domain and is only ever compared
 *   to a legacy material fingerprint, never to a choice prompt fingerprint.
 */
export type ChoiceBasis =
	| { kind: 'choice-v1'; fingerprint: string }
	| { kind: 'legacy-v2'; materialFingerprint?: string };

/** Latest decision for one optional category. */
export interface CategoryDecision {
	/** Raw explicit value. `false` is a denial and never ages. */
	value: boolean;
	/** Epoch milliseconds when this category was confirmed. */
	confirmedAt: number;
	/** Policy contract the confirmation was made under. */
	basis: ChoiceBasis;
}

/**
 * Explicit category choices. Absent keys are undecided; the evaluator
 * fills them from the policy default without writing them back.
 */
export interface ExplicitChoice {
	version: 3;
	categories: Partial<Record<OptionalConsentCategory, CategoryDecision>>;
}

/** Local record that the current notice was explicitly dismissed. */
export interface NoticeDismissal {
	version: 1;
	/** Epoch milliseconds of the dismissal. */
	dismissedAt: number;
	/** Notice prompt fingerprint the dismissal was made against. */
	fingerprint: string;
}

/**
 * Standing privacy directive recorded from a user-agent signal. It is a
 * privacy request, not a consent record, and it outlives the live signal.
 */
export interface PrivacyOptOut {
	source: 'gpc';
	/** Categories the directive restricts. */
	categories: readonly OptionalConsentCategory[];
	/** Epoch milliseconds when the directive was recorded. */
	recordedAt: number;
}

/** Subject identifiers carried at the record's enclosing boundary. */
export interface ConsentSubject {
	subjectId?: string;
	externalId?: string;
	identityProvider?: string;
}

/**
 * Semantic validity of a record kind. `maxAgeMs: null` is an explicit
 * unbounded compatibility projection for policies that configure no
 * expiry today; it is not a default the evaluator invents.
 */
export interface RecordValidity {
	fingerprint: string;
	maxAgeMs: number | null;
}

/**
 * Validated policy projection the evaluator consumes. Wildcards are
 * already expanded and fingerprints are computed once at resolution.
 */
export interface EvaluationPolicy {
	model: PolicyModel;
	prompt: PolicyPrompt;
	/** Optional categories the policy governs, sorted and deduplicated. */
	scope: readonly OptionalConsentCategory[];
	/** How categories outside `scope` behave. */
	scopeMode: 'strict' | 'permissive';
	choice: RecordValidity;
	notice: RecordValidity;
	/**
	 * Legacy material fingerprint of the same policy, when resolution can
	 * supply one. Only used to judge `legacy-v2` decisions. `null` means
	 * no comparison is possible and legacy decisions are grandfathered.
	 */
	legacyMaterialFingerprint: string | null;
	/** Categories an active GPC signal denies. Empty means GPC is not honored. */
	gpcDenyCategories: readonly OptionalConsentCategory[];
}

/** Why a category is restricted regardless of grants or defaults. */
export type RestrictionReason =
	| 'explicit-denial'
	| 'strict-scope'
	| 'gpc'
	| 'opt-out-directive';

/** Authority status of a stored positive or negative decision. */
export type DecisionAuthority =
	| 'absent'
	| 'valid'
	| 'expired'
	| 'policy-changed';

/** Where an effective permission came from. */
export type PermissionSource = 'grant' | 'default' | 'restricted';

/** Per-category diagnostics derived during evaluation. */
export interface CategoryEvaluation {
	permitted: boolean;
	source: PermissionSource;
	authority: DecisionAuthority;
	inScope: boolean;
	/** Epoch milliseconds when a valid bounded decision stops being fresh. */
	expiresAt: number | null;
	restrictions: readonly RestrictionReason[];
}

/** Result of one pure evaluation. */
export interface ConsentEvaluation {
	/** Effective permissions for gates. `necessary` is always `true`. */
	permissions: Readonly<Record<ConsentCategory, boolean>>;
	/**
	 * Categories restricted by an explicit denial, strict scope exclusion,
	 * or a privacy opt-out. Distinct from a merely absent opt-in grant so
	 * IAB targets can honor refusals without gaining category prerequisites.
	 */
	restrictions: Readonly<
		Partial<Record<OptionalConsentCategory, readonly RestrictionReason[]>>
	>;
	promptRequirement: PromptRequirement;
	/** Earliest future time that can change permissions or prompt state. */
	nextDeadline: number | null;
	categories: Readonly<Record<OptionalConsentCategory, CategoryEvaluation>>;
}
