/**
 * The mobile consent snapshot: the one immutable value the native cores own
 * and the JavaScript layer renders.
 *
 * This is the shape on the wire. It is the kernel snapshot from `@c15t/core`
 * restricted to the fields that matter on device, plus the lifecycle flags a
 * native gate needs (`ready`, `policyPending`) and the IAB slot held open as
 * `null`. The native cores serialize exactly this object from `getSnapshot()`;
 * the JavaScript layer never derives it.
 */

import type {
	AllConsentNames,
	ConsentState,
	ConsentSubject,
	ExplicitChoice,
	KernelActiveUI,
	KernelModel,
	KernelTranslations,
	LocationResponse,
	OptionalConsentCategory,
	PolicyResolution,
	PromptRequirement,
	RestrictionReason,
} from '@c15t/core';

import type { NativeOverrides } from './overrides';

/**
 * Consent model enforced on device.
 *
 * `iab` is excluded: TCF is out of scope for this phase, and a native core
 * must never resolve a model it cannot evaluate.
 */
export type NativeModel = Exclude<KernelModel, 'iab'>;

/**
 * Explainability half of the policy resolution, as carried on the snapshot.
 *
 * The matched rule itself stays on the native side. The JavaScript layer only
 * needs to know whether a rule matched and which one, so it can show
 * explainability and decide when a re-prompt is owed.
 */
export interface SnapshotResolution {
	/** Resolution outcome, shared with the kernel's vocabulary. */
	readonly status: PolicyResolution['status'];
	/** Identifier of the matched policy, `null` when nothing matched. */
	readonly policyId: string | null;
	/** Fingerprint of the matched rule, `null` when nothing matched. */
	readonly fingerprint: string | null;
}

/**
 * Privacy signals the native cores honor.
 *
 * `gpc` is the effective Global Privacy Control signal: the platform value
 * already merged with any app override. `msa` is reserved and always `false`
 * in this phase, held open so a later signal is an additive field.
 */
export interface NativePrivacySignals {
	readonly gpc: boolean;
	readonly msa: boolean;
}

/**
 * Failure the native core is holding, if any.
 *
 * A failed init does not throw into the app. It sets `error`, keeps
 * `policyPending` true, and leaves every optional category denied.
 */
export interface NativeSnapshotError {
	readonly code: string;
	readonly message: string;
}

/**
 * The immutable snapshot `getSnapshot()` returns as a JSON string.
 *
 * `ready` and `policyPending` are the two flags a gate must consult: while
 * either is unset, every optional category reads `false`. `revision` is
 * monotonic and is the only value an event needs to carry, because
 * subscribers pull the snapshot instead of receiving a copy of it.
 */
export interface ConsentSnapshot {
	/** Monotonic revision, bumped on every native mutation. */
	readonly revision: number;
	/** `true` until the first init resolves a policy. */
	readonly policyPending: boolean;
	/** `false` until the stored envelope finished hydrating. */
	readonly ready: boolean;
	/** Model the evaluator applies. */
	readonly model: NativeModel;
	/** Surface the UI should render, if any. */
	readonly activeUI: KernelActiveUI;
	/** Interaction the active policy still requires. */
	readonly promptRequirement: PromptRequirement;
	/** Effective permissions every gate reads. */
	readonly effectivePermissions: ConsentState;
	/** Latest per-category receipts. Only accept, reject and save write it. */
	readonly explicitChoice: ExplicitChoice | null;
	/** Categories in play. `null` uses the full policy scope. */
	readonly consentCategories: readonly AllConsentNames[] | null;
	/** Categories denied regardless of grants, with the reason. */
	readonly restrictions: Partial<
		Record<OptionalConsentCategory, readonly RestrictionReason[]>
	>;
	/** Explainability for how the policy was matched. */
	readonly resolution: SnapshotResolution;
	/** Signed token for write-time consistency, sent back on save. */
	readonly policySnapshotToken: string | null;
	/** Subject identifiers, carried once. */
	readonly subject: ConsentSubject | null;
	/** Geographic context reported by the backend. */
	readonly location: LocationResponse | null;
	/** Geographic, language and test overrides in effect. */
	readonly overrides: NativeOverrides;
	/** Effective privacy signals. */
	readonly privacySignals: NativePrivacySignals;
	/** Standing privacy directives. Always empty in this phase. */
	readonly optOutDirectives: readonly [];
	/** Resolved translation bundle. */
	readonly translations: KernelTranslations | null;
	/** Earliest future time (epoch ms) that can change permissions. */
	readonly nextDeadline: number | null;
	/** Epoch milliseconds of the last evaluation. */
	readonly evaluatedAt: number;
	/** Failure the core is holding, or `null`. */
	readonly error: NativeSnapshotError | null;
	/**
	 * IAB TCF slot, reserved and always `null` in this phase.
	 *
	 * The key stays so a JavaScript layer that predates TCF does not have to
	 * branch, and so adding TCF later is an additive protocol change.
	 */
	readonly iab: null;
}
