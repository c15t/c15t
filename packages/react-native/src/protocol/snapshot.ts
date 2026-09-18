/**
 * The mobile consent snapshot: the one immutable value the native cores own
 * and the JavaScript layer renders.
 *
 * This is the shape on the wire. It is the kernel snapshot from `@c15t/core`
 * restricted to the fields that matter on device, plus the lifecycle flags a
 * native gate needs (`ready`, `policyPending`) and the IAB slot, which carries
 * the vendor list a device was served. The native cores serialize exactly this
 * object from `getSnapshot()`; the JavaScript layer never derives it.
 */

import type { GlobalVendorList } from './gvl';
import type { NativeOverrides } from './overrides';
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
	PolicyResolutionStatus,
	PromptRequirement,
	RestrictionReason,
} from './vocabulary';

/**
 * Consent model enforced on device.
 *
 * `iab` is excluded because no native core resolves it: Kotlin's `Enums.kt`
 * refuses the wire value and `StrictPolicyReader` fails closed on it, and
 * Swift's `ConsentModel` never names it. A core that answered `iab` would
 * promise an evaluation it cannot do.
 *
 * Reading a served vendor list is a different question, and {@link
 * NativeIABState} answers it: a device may hold the list `/init` embedded while
 * the model it evaluates is `opt-in`, because the list is disclosure, not a
 * permission rule.
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
	readonly status: PolicyResolutionStatus;
	/** Identifier of the matched policy, `null` when nothing matched. */
	readonly policyId: string | null;
	/** Fingerprint of the matched rule, `null` when nothing matched. */
	readonly fingerprint: string | null;
}

/**
 * Privacy signals the native cores honor.
 *
 * Mirrors `KernelPrivacySignals` in `@c15t/core`. The three members are not
 * interchangeable and a gate must read `active`:
 *
 * - `detected` is what the device reported. On mobile there is no user-agent
 *   flag to read, so this is the host app's report, or what `/init` resolved.
 * - `override` is {@link NativeOverrides.gpc}, `null` when the app set none.
 * - `active` is the value the evaluator honors: the override when set, else
 *   the detection.
 */
export interface NativeGpcSignal {
	/** Signal the device or backend reported. */
	readonly detected: boolean;
	/** Explicit override from {@link NativeOverrides.gpc}, or `null`. */
	readonly override: boolean | null;
	/** Signal the evaluator honors: the override when set, else the detection. */
	readonly active: boolean;
}

/**
 * Privacy signals the native cores honor.
 */
export interface NativePrivacySignals {
	readonly gpc: NativeGpcSignal;
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
 * The IAB half of a snapshot.
 *
 * Mirrors `KernelIABState` in `@c15t/core` on `gvl` alone. The kernel's other
 * members -- `authority`, `enabled`, `cmpId`, `tcString`, `gvlReference`,
 * `customVendors`, and the per-vendor and per-purpose vectors -- are IAB runtime
 * state a device does not own yet, and an absent key says that plainly where
 * `enabled: false` would claim an answer about a module that is not there.
 * Swift's `KernelIABState` makes the same cut for the same reason and encodes
 * `gvl` always present, so a reader never confuses "no list served" with "no
 * answer given". The document behind the name is `./gvl`.
 */
export interface NativeIABState {
	/** Global Vendor List (IAB-registered vendors + purposes), or `null`. */
	readonly gvl: GlobalVendorList | null;
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
	/**
	 * Categories the consent surfaces list: `necessary` first, then the categories
	 * of the resolved policy scope the app's declared scope survives. The native
	 * core decides this list the way the web dialog decides its own, so a name the
	 * policy does not govern is never rendered. `null` only while no configuration
	 * has been installed, where the UI lists every category it knows.
	 */
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
	/** Geographic, language, and GPC overrides in effect. */
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
	 * IAB TCF state: the vendor list this device was served, or `null`.
	 *
	 * `null` is a real answer, and there is one way to hold it: no `/init` has served a
	 * `gvl` this build could read. That is the ordinary answer for every policy whose
	 * model is not `iab`, because the backend embeds a list only while it is.
	 *
	 * Both cores fold a served list onto this key and keep it when a later `/init`
	 * serves none. The disclosure a subject was already shown is drawn out of that
	 * document, so dropping it would change a claim the subject was given without the
	 * subject doing anything, and only a reset takes it back. Kotlin keeps the bytes
	 * under the stored envelope's own `gvl` key and puts them back here on hydration,
	 * so the encrypted blob carries one copy of the largest thing in it and a device
	 * upgrading from a build that kept the list only there keeps its disclosure.
	 *
	 * A host app's own code reads the same document off the same state: Kotlin's
	 * `C15tKernel.vendorListBody()` and Swift's `globalVendorList()` are both the
	 * snapshot field, which is what keeps a disclosure drawn natively and one drawn
	 * through this bridge naming the same vendors.
	 *
	 * The key is never absent: a serialised `null` where there is no list is what lets
	 * a JavaScript layer that predates TCF avoid branching on an SDK version.
	 */
	readonly iab: NativeIABState | null;
}
