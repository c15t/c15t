/**
 * The commit boundary: what the app sends when a user decides, and what the
 * native core reports back.
 */

import type {
	AllConsentNames,
	OptionalConsentCategory,
	SavePayload,
} from '@c15t/core';

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
export type NativeSavePayload = SavePayload;
