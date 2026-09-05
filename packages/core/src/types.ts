/**
 * Kernel public types.
 *
 * These are the only types consumers see. Internal implementation types
 * (listener sets, pending writes, timers, the staged draft) stay
 * un-exported.
 *
 * The consent model has one explicit-choice record and one derived
 * effective-permission map. They are different facts: only accept, reject
 * and save create a choice; permissions are derived from that choice, the
 * active policy, expiry, scope and privacy signals. Draft values never
 * establish processing permissions.
 */
import type {
	GlobalVendorList,
	LocationResponse,
	NonIABVendor,
	PolicyResolution,
	PolicyScopeMode,
	ResolvedPolicyRule,
	TranslationsResponse,
} from '@c15t/schema/types';

import type {
	ConsentSubject,
	EvaluationPolicy,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
	PromptReason,
	PromptRequirement,
	RestrictionReason,
} from './consent-record/types';
import type { RecordIssue } from './consent-record/validation';
import type { AllConsentNames } from './consent/consent-types';

// Re-export schema types that consumers need so they don't have to
// import from @c15t/schema directly for routine work.
export type {
	GlobalVendorList,
	LocationResponse,
	NonIABVendor,
	PolicyResolution,
	PolicyScopeMode,
	ResolvedPolicyRule,
	TranslationsResponse,
};

export type {
	ConsentSubject,
	EvaluationPolicy,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
	PromptReason,
	PromptRequirement,
	RecordIssue,
	RestrictionReason,
};

/**
 * Brand palette served by `/init` (or chosen offline). Drives default
 * UI theme but has no effect on consent semantics.
 */
export type KernelBranding = 'c15t' | 'consent' | 'inth';

/**
 * Permission model the runtime enforces, derived from the effective policy
 * rule and IAB enablement.
 * - `opt-in`  — optional categories are denied until a valid explicit grant
 * - `opt-out` — optional categories are allowed until denied
 * - `iab`     — an IAB rule with the IAB module enabled
 *
 * The kernel always resolves a model because every non-matched resolution uses the
 * safe opt-in fallback rule.
 */
export type KernelModel = 'opt-in' | 'opt-out' | 'iab';

/**
 * Consent model alias used by UI adapters.
 */
export type Model = KernelModel;

/**
 * Which UI surface the adapter should render, if any. Derived from the
 * prompt requirement; adapters may set
 * it to open or close a surface.
 */
export type KernelActiveUI = 'none' | 'banner' | 'dialog' | null;

/**
 * Active UI surface once the kernel has resolved (never `null`).
 */
export type ActiveUI = 'none' | 'banner' | 'dialog';

/**
 * Boolean map over every category. On the snapshot this is the
 * effective-permission map gates consume.
 */
export type ConsentState = Record<AllConsentNames, boolean>;

/**
 * Geographic + language + GPC overrides that affect policy evaluation.
 * `gpc` is the test/developer override; the detected browser signal is
 * carried separately in {@link KernelPrivacySignals}.
 */
export interface KernelOverrides {
	country?: string;
	region?: string;
	language?: string;
	gpc?: boolean;
}

/**
 * Privacy signals the kernel knows about.
 */
export interface KernelPrivacySignals {
	readonly gpc: {
		/**
		 * Detected user-agent signal: `navigator.globalPrivacyControl === true`
		 * in the browser or `Sec-GPC: 1` on the request.
		 */
		readonly detected: boolean;
		/** Explicit override from {@link KernelOverrides.gpc}, if any. */
		readonly override: boolean | undefined;
		/** Signal the evaluator honors: the override when set, else detection. */
		readonly active: boolean;
	};
}

/**
 * User identification attached to consent records.
 * External ID only — no PII beyond what the consumer opts in.
 */
export interface KernelUser {
	externalId: string;
	externalIdType?: string;
	identityProvider?: string;
	properties?: Record<string, string | number | boolean>;
}

/**
 * Translation bundle carried on the snapshot. Matches the `translations`
 * field of the `/init` response — a single resolved language + payload.
 */
export interface KernelTranslations {
	language: string;
	translations: TranslationsResponse;
}

/**
 * IAB TCF state, populated when the `/init` response carries a GVL and
 * the kernel is running in `model === 'iab'`. Mutations go through
 * `kernel.set.iab(patch)` — the IAB module is the primary writer. TC
 * authority (validity, expiry) is owned by the IAB module; the kernel never
 * derives category authority from it.
 */
export interface KernelIABAuthority {
	/** Validated TC string from an explicit IAB confirmation or stored receipt. */
	tcString: string;
	/** Original confirmation clock, never renewed by hydration. */
	confirmedAt: number;
	/** Absolute validity deadline in epoch milliseconds. */
	expiresAt: number;
	/** Existing choice-v1 fingerprint of the policy at confirmation. */
	choiceFingerprint: string;
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests: Record<string, boolean>;
	purposeConsents: Record<number, boolean>;
	purposeLegitimateInterests: Record<number, boolean>;
	specialFeatureOptIns: Record<number, boolean>;
}

export interface KernelIABState {
	/** Confirmed authority installed by the IAB addon after TC validation. */
	authority: KernelIABAuthority | null;
	/** Whether IAB mode is active. False even when fields are populated
	 * if the consumer has explicitly disabled IAB. */
	enabled: boolean;
	/** Global Vendor List (IAB-registered vendors + purposes). */
	gvl: GlobalVendorList | null;
	/** Non-IAB vendors declared by the publisher. */
	customVendors: NonIABVendor[];
	/** CMP ID registered with IAB Europe. */
	cmpId: number | null;
	/** Per-vendor consent (vendorId → boolean). */
	vendorConsents: Record<string, boolean>;
	/** Per-vendor legitimate interest. */
	vendorLegitimateInterests: Record<string, boolean>;
	/** Per-purpose consent (purposeId 1–11 → boolean). */
	purposeConsents: Record<number, boolean>;
	/** Per-purpose legitimate interest. */
	purposeLegitimateInterests: Record<number, boolean>;
	/** Special features (1 = geolocation, 2 = device ID). */
	specialFeatureOptIns: Record<number, boolean>;
	/** Latest TC string, set after `save()` encodes one. */
	tcString: string | null;
}

/**
 * Records a hydration boundary can apply without creating a choice.
 *
 * Semantics per key: omitted preserves the current value, an explicit
 * `null` (or empty array) clears it. Every record is validated against
 * `now` before anything is applied; an invalid input rejects the whole
 * call.
 */
export interface HydrationRecords {
	choice?: ExplicitChoice | null;
	subject?: ConsentSubject | null;
	noticeDismissal?: NoticeDismissal | null;
	optOutDirectives?: readonly PrivacyOptOut[];
	/** Evaluation time in epoch milliseconds. Defaults to `Date.now()`. */
	now?: number;
}

/** Result of `kernel.hydrate()`. */
export type HydrationResult =
	| { ok: true; changed: boolean }
	| { ok: false; issues: RecordIssue[] };

/**
 * The snapshot returned by `getSnapshot()` and passed to subscribers.
 * Frozen for cheap reference-equality checks; adapters can use `===` to
 * skip work. Derived fields keep their previous reference when their
 * value did not change.
 */
export interface ConsentSnapshot {
	// -- Consent model -------------------------------------------------------
	/** Latest explicit per-category receipts. Only accept, reject and save write it. */
	readonly explicitChoice: Readonly<ExplicitChoice> | null;
	/** Effective permissions for script, iframe, network and Consent Mode gates. */
	readonly effectivePermissions: Readonly<ConsentState>;
	/** Interaction the active policy still requires. */
	readonly promptRequirement: Readonly<PromptRequirement>;
	/** Local record that the current notice was dismissed. */
	readonly noticeDismissal: Readonly<NoticeDismissal> | null;
	/** Detected and overridden privacy signals. */
	readonly privacySignals: KernelPrivacySignals;
	/** Standing privacy directives; they outlive the live signal. */
	readonly optOutDirectives: readonly PrivacyOptOut[];
	/** Policy resolution outcome. `policy` is `null` for every non-matched status. */
	readonly resolution: Readonly<PolicyResolution>;
	/** Rule the evaluator uses: the matched rule or the safe opt-in fallback. */
	readonly policyRule: Readonly<ResolvedPolicyRule>;
	/** Categories restricted by a denial, strict scope or a privacy opt-out. */
	readonly restrictions: Readonly<
		Partial<Record<OptionalConsentCategory, readonly RestrictionReason[]>>
	>;
	/** Earliest future time (epoch ms) that can change permissions or the prompt. */
	readonly nextDeadline: number | null;
	/** Subject identifiers, carried once. */
	readonly subject: Readonly<ConsentSubject> | null;
	/** Epoch milliseconds of the last evaluation. */
	readonly evaluatedAt: number;
	/** Validated policy projection the evaluator consumed. Devtools and gate-time re-evaluation only. */
	readonly evaluationPolicy: Readonly<EvaluationPolicy>;

	/** Read-only diagnostic for devtools: whether an explicit receipt exists. Never gates UI or saves. */
	readonly hasConsented: boolean;

	// -- Context -------------------------------------------------------------
	readonly overrides: Readonly<KernelOverrides>;
	readonly user: Readonly<KernelUser> | null;
	/** Monotonic revision, bumps on every mutation. */
	readonly revision: number;

	// -- Init-response derived state -----------------------------------------
	/** Geographic context reported by the backend. */
	readonly location: Readonly<LocationResponse> | null;
	/** Resolved translation bundle. */
	readonly translations: Readonly<KernelTranslations> | null;
	/** Branding identifier. */
	readonly branding: KernelBranding | null;
	/** Explainability metadata for how the policy was matched. */

	/** Signed token for write-time consistency — sent back on save. */
	readonly policySnapshotToken: string | null;

	// -- Derived from policy rule + iab.enabled -------------------------------
	/** Effective consent model. */
	readonly model: KernelModel;
	/** Which UI surface should render, if any. */
	readonly activeUI: KernelActiveUI;
	/**
	 * `true` while the policy in the snapshot is a placeholder awaiting the
	 * transport's init resolution. While provisional, `activeUI` stays
	 * `'none'`. A failed init also keeps the first layer hidden.
	 */
	readonly policyPending: boolean;

	// -- IAB passthrough (null when IAB not enabled) -------------------------
	readonly iab: Readonly<KernelIABState> | null;
}

/**
 * Configuration accepted by `createConsentKernel()`. Pure data — no
 * functions run at construction. A transport, if provided, is held as a
 * handle and only invoked when the corresponding command fires.
 */
export interface KernelConfig {
	/**
	 * Evaluation clock in epoch milliseconds. A server render passes the
	 * request time so the client can seed the same value and produce the same
	 * initial snapshot. Defaults to `initialRecords.now`, then `Date.now()`.
	 */
	now?: number;
	/** Validated stored records, usually read from the request cookie header. */
	initialRecords?: HydrationRecords;
	/** Policy resolution already computed by a producer or a server prefetch. */
	initialPolicyResolution?: PolicyResolution;
	/** Detected privacy signals (for example `Sec-GPC: 1` on the request). */
	initialPrivacySignals?: { gpc?: boolean };
	/**
	 * Seeds only the staged draft a no-input `save()` confirms. It
	 * never creates a choice or changes permissions.
	 */
	initialDraft?: Partial<ConsentState>;
	/** Initial geographic / language / GPC context. */
	initialOverrides?: KernelOverrides;
	/** Initial identified user, if known at construction. */
	initialUser?: KernelUser;
	/** Initial translation bundle (e.g. from prefetch). */
	initialTranslations?: KernelTranslations;
	/** Initial location (e.g. from prefetch). */
	initialLocation?: LocationResponse;
	/** Initial branding. */
	initialBranding?: KernelBranding;
	/**
	 * Marks the policy as pending transport initialization.
	 * Suppresses `activeUI` until init completes.
	 */
	initialPolicyPending?: boolean;
	/**
	 * Retry policy for failed transport initialization. The first call is
	 * attempt 1. Defaults to 5 total attempts, a 1,000 ms base delay, and a
	 * 30,000 ms cap with exponential backoff and jitter. Set to `false` to
	 * disable background retries.
	 */
	initRetry?:
		| {
				/** Total attempts including the initial call. Defaults to 5. */
				maxAttempts?: number;
				/** Initial backoff delay in milliseconds. Defaults to 1,000. */
				baseDelayMs?: number;
				/** Maximum backoff delay in milliseconds. Defaults to 30,000. */
				maxDelayMs?: number;
		  }
		| false;
	/** Initial policy decision. */

	/** Initial policy snapshot token. */
	initialPolicySnapshotToken?: string;
	/** Initial IAB slice. */
	initialIab?: Partial<KernelIABState>;
	/**
	 * Transport that carries out async commands (init, save, identify).
	 * Optional — without a transport, commands run as no-ops and return
	 * minimal success results.
	 */
	transport?: KernelTransport;
}

/**
 * Context passed to `transport.init()`.
 */
export interface InitContext {
	overrides: Readonly<KernelOverrides>;
	user: Readonly<KernelUser> | null;
}

/**
 * Response from `transport.init()`. Any field may be omitted; omitted
 * fields leave the current snapshot value alone.
 */
export interface InitResponse {
	/** Geographic context the transport resolved (e.g. from IP lookup). */
	resolvedOverrides?: KernelOverrides;
	/** Detected privacy signals, for example from the `Sec-GPC` header. */
	resolvedPrivacySignals?: { gpc?: boolean };
	/**
	 * Raw `policyResolution` wire value. Read with the strict schema reader;
	 * anything the client cannot represent fails safely. Missing policy
	 * contracts fail with `invalid-payload`.
	 */
	policyResolution?: unknown;
	/** Server-mapped receipts, applied through the hydration boundary. */
	records?: HydrationRecords;
	/** Server-side subject ID, if the user already has one. */
	subjectId?: string;

	/** Geographic context reported by the transport (country + region). */
	location?: LocationResponse;
	/** Resolved translation bundle. */
	translations?: KernelTranslations;
	/** Branding preference. */
	branding?: KernelBranding;
	/** Explainability metadata for policy resolution. */

	/** Signed token for write-time consistency. Sent back on save. */
	policySnapshotToken?: string;

	/** Global Vendor List. `null` means the server disabled IAB for this request. */
	gvl?: GlobalVendorList | null;
	/** Non-IAB vendors configured on the backend. */
	customVendors?: NonIABVendor[];
	/** CMP ID registered with IAB Europe. */
	cmpId?: number;
}

/** Categories one save confirmed, with the single captured action time. */
export interface ConfirmedCoverage {
	categories: Readonly<Partial<Record<OptionalConsentCategory, boolean>>>;
	/** Epoch milliseconds captured once, before any yield or network call. */
	actionAt: number;
}

/**
 * Payload passed to `transport.save()`. Built once per explicit action and
 * reused unchanged by a queued replay.
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
	/** TC string emitted by the IAB module; absent in non-IAB flows. */
	tcString?: string | null;
	/** Equals `confirmed.actionAt`. Kept for backends that read one time. */
	givenAt?: number;
}

/**
 * Pluggable transport. Each method is optional — a partial transport is
 * valid. Missing methods make the corresponding command a no-op.
 */
export interface KernelTransport {
	init?: (ctx: InitContext) => Promise<InitResponse>;
	save?: (payload: SavePayload) => Promise<SaveResult>;
	identify?: (user: KernelUser, subjectId: string | null) => Promise<void>;
	/**
	 * Load the server-side record of a subject as validated receipts. The
	 * kernel calls it after `identify` succeeds and applies the result through
	 * the hydration boundary, never as a choice.
	 */
	loadSubjectRecord?: (subjectId: string) => Promise<HydrationRecords | null>;
	/**
	 * Persist a standing privacy directive for an identified subject. Called
	 * when a directive is recorded while `user` is set. Failures emit
	 * `command:error` and never change local state.
	 */
	recordPrivacyOptOut?: (
		directive: PrivacyOptOut,
		subjectId: string | null
	) => Promise<void>;
}

/**
 * Kernel event surface. Stable event names.
 */
export type KernelEvent =
	| { type: 'records:cleared' }
	| {
			/** An explicit accept, reject or save recorded a choice. */
			type: 'choice:recorded';
			snapshot: ConsentSnapshot;
			/** Categories whose receipt this action replaced. */
			confirmed: readonly OptionalConsentCategory[];
			actionAt: number;
	  }
	| {
			/** Effective permissions changed by value (choice, policy, expiry, privacy). */
			type: 'permissions:changed';
			snapshot: ConsentSnapshot;
			previous: Readonly<ConsentState>;
	  }
	| {
			/** The current notice was explicitly dismissed. Permissions unchanged. */
			type: 'notice:dismissed';
			snapshot: ConsentSnapshot;
			dismissal: NoticeDismissal;
	  }
	| {
			/** A standing privacy directive was recorded from a user-agent signal. */
			type: 'privacy:opt-out';
			snapshot: ConsentSnapshot;
			directive: PrivacyOptOut;
	  }
	| { type: 'overrides:set'; snapshot: ConsentSnapshot }
	| { type: 'user:identified'; snapshot: ConsentSnapshot }
	| { type: 'iab:set'; snapshot: ConsentSnapshot }
	| { type: 'init:applied'; snapshot: ConsentSnapshot }
	| {
			/** Transport initialization failed and the first layer stayed hidden. */
			type: 'init:failed';
			error: unknown;
			/** One-based attempt number. */
			attempt: number;
			/** Scheduled retry delay, or `null` when no retry remains. */
			nextRetryMs: number | null;
	  }
	| {
			/** A queued consent save was attempted again. */
			type: 'save:replayed';
			subjectId: string;
			ok: boolean;
	  }
	| { type: 'command:init:started' }
	| { type: 'command:init:completed'; result: InitResult }
	| { type: 'command:save:started' }
	| { type: 'command:save:completed'; result: SaveResult }
	| { type: 'command:error'; command: string; error: unknown };

/**
 * Listener signature for subscriptions and events.
 */
export type Listener<T> = (value: T) => void;

/**
 * Returned by `subscribe()` / `events.on()`. Call to stop listening.
 */
export type Unsubscribe = () => void;

/**
 * Result returned by `commands.init()`.
 */
export interface InitResult {
	ok: boolean;
	error?: unknown;
}

/**
 * Input accepted by `commands.save()`.
 * - `'all'` confirms every category in the active scope with `true`.
 * - `'none'` confirms every category in the active scope with `false`.
 * - an object confirms exactly its own optional category keys.
 * - omitted confirms the presented selection for the active scope: the
 *   staged draft value, else the explicit value, else the model's displayed
 *   default. Never the masked effective permissions.
 */
export type SaveInput = 'all' | 'none' | Partial<ConsentState>;

/**
 * Result returned by `commands.save()`. `ok: false` with `issues` means the
 * input was rejected atomically and nothing changed.
 */
export interface SaveResult {
	ok: boolean;
	subjectId?: string;
	/** Categories this save confirmed. Empty when nothing was recorded. */
	confirmed?: readonly OptionalConsentCategory[];
	issues?: RecordIssue[];
}

/** Result returned by `commands.dismissNotice()`. */
export type NoticeDismissResult =
	| { ok: true; dismissal: NoticeDismissal }
	| { ok: false; reason: 'not-required' };

/**
 * The public kernel contract.
 */
export interface ConsentKernel {
	/**
	 * Cancel background retries, the deadline timer and browser listeners.
	 * Idempotent. Snapshot reads and explicit commands remain available.
	 */
	dispose: () => void;
	/** Returns the current snapshot. Cheap, non-allocating. */
	getSnapshot: () => ConsentSnapshot;
	/** Invalidation token for addon work spanning an asynchronous boundary.
	 * @internal
	 */
	getRecordsGeneration: () => number;

	/**
	 * Returns the immutable revision-0 snapshot — the state a server render
	 * saw. Hydration-time consumers must render from this, not the live
	 * snapshot.
	 */
	getServerSnapshot: () => ConsentSnapshot;

	/**
	 * Subscribe to snapshot changes. Returns an unsubscribe function.
	 */
	subscribe: (listener: Listener<ConsentSnapshot>) => Unsubscribe;

	/**
	 * Apply validated stored records without creating a choice. Emits
	 * `permissions:changed` when permissions changed and nothing else. Marks
	 * the lifecycle as started, which installs the deadline timer and lets a
	 * detected GPC signal record its standing directive.
	 */
	hydrate: (records: HydrationRecords) => HydrationResult;

	/**
	 * Re-evaluate at `now` (default `Date.now()`). Gates call this before a
	 * time-sensitive decision so an elapsed expiry cannot hide behind a
	 * delayed timer. Advances the snapshot only when something changed.
	 */
	refresh: (now?: number) => ConsentSnapshot;

	/**
	 * Sync mutations. Notify subscribers synchronously.
	 */
	readonly set: {
		/** Stages draft values a no-input `save()` confirms. Never a grant. */
		draft: (input: Partial<ConsentState>) => void;
		overrides: (input: KernelOverrides) => void;
		language: (code: string) => void;
		subjectId: (id: string | null) => void;
		/** Detected user-agent privacy signals. */
		privacySignals: (input: { gpc?: boolean }) => void;
		/** Set the active UI surface. */
		activeUI: (ui: KernelActiveUI) => void;
		/** Patch the IAB slice. Creates the slice if currently null. */
		iab: (patch: Partial<KernelIABState>) => void;
	};

	/**
	 * Async commands. These are the places where I/O lives.
	 */
	readonly commands: {
		init: () => Promise<InitResult>;
		save: (
			input?: SaveInput,
			context?: {
				/** Addon confirmation time captured before asynchronous encoding. Never for hydration or renewal. */
				actionAt?: number;
				/** Validated addon authority confirmed by this action.
				 * @internal
				 */
				iabAuthority?: KernelIABAuthority;
			}
		) => Promise<SaveResult>;
		/** Dismiss the current notice. Only while `promptRequirement.kind === 'notice'`. */
		dismissNotice: () => Promise<NoticeDismissResult>;
		identify: (user: KernelUser) => Promise<void>;
	};

	/**
	 * Typed event stream for observability, devtools, analytics.
	 */
	readonly events: {
		on: <E extends KernelEvent['type']>(
			type: E,
			listener: Listener<Extract<KernelEvent, { type: E }>>
		) => Unsubscribe;
		emit: (event: KernelEvent) => void;
	};
}
