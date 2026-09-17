/**
 * The commit boundary: what the app sends when a user decides, and what the
 * native core reports back.
 */

import type {
	AllConsentNames,
	ConsentState,
	ConsentSubject,
	ExplicitChoice,
	KernelActiveUI,
	KernelModel,
	OptionalConsentCategory,
} from './vocabulary';

/**
 * A consent action forwarded to the native core.
 *
 * The three shapes cover every prompt surface: an accept, a reject-everything
 * or save, and a preference-centre save. `explicit` carries exactly the
 * categories the user touched, so a partial save cannot renew a receipt the
 * user never looked at.
 */
export type CommitIntent =
	| { readonly action: 'all'; readonly categories?: readonly AllConsentNames[] }
	| {
			readonly action: 'necessary';
			readonly categories?: readonly AllConsentNames[];
	  }
	| {
			readonly action: 'explicit';
			readonly consents: Readonly<
				Partial<Record<OptionalConsentCategory, boolean>>
			>;
			readonly categories?: readonly AllConsentNames[];
	  };

/**
 * Why a commit did not reach the backend.
 *
 * `queued` is not a failure: the payload is persisted and replayed, so the
 * snapshot is already correct offline.
 *
 * `not-bootstrapped` is the native core refusing because no configuration was
 * ever installed, which is a host wiring bug rather than a consent outcome.
 * Both native bridges already report it; this union is what lets JavaScript
 * name it.
 */
export type CommitFailureReason =
	| 'invalid-intent'
	| 'no-subject'
	| 'not-bootstrapped'
	| 'queued';

/**
 * Result of `commit(intent)`.
 *
 * `revision` is the snapshot revision the action produced. Pull
 * `getSnapshot()` when it differs from the one a subscriber already holds.
 */
export interface CommitResult {
	/** `true` when the native core applied the action. */
	readonly ok: boolean;
	/** Snapshot revision after the action, `null` when nothing changed. */
	readonly revision: number | null;
	/** Categories this action recorded receipts for. */
	readonly confirmed: readonly OptionalConsentCategory[];
	/** Subject the receipts belong to. */
	readonly subjectId: string | null;
	/**
	 * `true` when the payload was persisted for replay instead of delivered.
	 * Consent is applied locally either way.
	 */
	readonly queued: boolean;
	/** Present only when `ok` is `false`. */
	readonly reason?: CommitFailureReason;
}

/**
 * The exact backend write the native core queued or delivered for an action.
 *
 * The pending queue stores this, not a re-derived request: a later init that
 * changes policy must not rewrite a queued payload. Native cores must
 * reproduce it byte for byte from the same inputs, which is what the
 * `save-body-*.json` fixtures assert.
 */

/**
 * Overrides as the kernel carries them on a save body.
 *
 * Not {@link NativeOverrides}: the snapshot's overrides are explicit `null` so a
 * native reader never branches on presence, while the payload the backend reads
 * keeps the kernel's optional properties, which is what a queued body written by
 * one build and replayed by another has to stay byte-identical to.
 */
export interface KernelOverrides {
	country?: string;
	region?: string;
	language?: string;
	gpc?: boolean;
}

/** The identified user carried on a save body, when the app has one. */
export interface KernelUser {
	externalId: string;
	externalIdType?: string;
	identityProvider?: string;
	properties?: Record<string, string | number | boolean>;
}

/** Categories one save confirmed, with the single captured action time. */
export interface ConfirmedCoverage {
	categories: Readonly<Partial<Record<OptionalConsentCategory, boolean>>>;
	/** Epoch milliseconds captured once, before any yield or network call. */
	actionAt: number;
}

/**
 * The backend write for one explicit action.
 *
 * Built once, then reused unchanged by a queued replay, which is why every field
 * here is captured at action time rather than read again at delivery time.
 */
export interface SavePayload {
	subjectId: string;
	subject: Readonly<ConsentSubject>;
	/** Receipt snapshot for this action; superseded categories are omitted when delivery is narrowed. */
	choice: Readonly<ExplicitChoice>;
	/** Exactly the categories this action confirmed. */
	confirmed: ConfirmedCoverage;
	/** Effective permissions after the action. */
	consents: Readonly<ConsentState>;
	overrides: Readonly<KernelOverrides>;
	user: Readonly<KernelUser> | null;
	model: KernelModel;
	uiSource: KernelActiveUI;
	consentAction: 'all' | 'necessary' | 'custom';
	policySnapshotToken: string | null;
	/**
	 * Resolved policy inputs captured with the action.
	 *
	 * The backend recomputes them before it accepts a choice, so a retry keeps
	 * the original inputs even after a later initialization changes policy.
	 */
	decisionInputs?: {
		policyId: string | null;
		fingerprint?: string;
		country: string | null;
		region: string | null;
		language: string;
		gpc: boolean;
	};
	/**
	 * TC string emitted by an IAB module.
	 *
	 * Always absent on device: this phase ships no TC string, and the field is
	 * carried so the payload stays the body the kernel and the fixtures describe.
	 */
	tcString?: string | null;
	/** Equals `confirmed.actionAt`. Kept for backends that read one time. */
	givenAt?: number;
}

export type NativeSavePayload = SavePayload;
