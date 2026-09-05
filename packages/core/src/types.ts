/**
 * Kernel public types.
 *
 * These are the only types consumers see. Internal implementation types
 * (listener sets, pending writes, policy evaluator inputs, etc.) stay
 * un-exported. Zustand/Immer/Valtio/whatever runs inside stays invisible.
 */
import type {
	GlobalVendorList,
	LocationResponse,
	NonIABVendor,
	PolicyDecision,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
	TranslationsResponse,
} from '@c15t/schema/types';

import type { AllConsentNames } from './consent/consent-types';

// Re-export schema types that consumers need so they don't have to
// import from @c15t/schema directly for routine work.
export type {
	GlobalVendorList,
	LocationResponse,
	NonIABVendor,
	PolicyDecision,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
	TranslationsResponse,
};

/**
 * Brand palette served by `/init` (or chosen offline). Drives default
 * UI theme but has no effect on consent semantics.
 */
export type KernelBranding = 'c15t' | 'consent' | 'inth';

/**
 * Consent model the runtime should enforce. Derived from the resolved
 * policy and IAB enablement.
 * - `opt-in`  — banner must appear before tracking (GDPR default)
 * - `opt-out` — tracking allowed by default, banner lets user opt out (CCPA)
 * - `iab`     — IAB TCF string drives everything
 * - `null`    — no regulation applies, banner not required
 */
export type KernelModel = 'opt-in' | 'opt-out' | 'iab' | null;

/**
 * Consent model alias used by UI adapters.
 */
export type Model = KernelModel;

/**
 * Which UI surface the adapter should render, if any. Derived from
 * `deriveActiveUI(model, policy.ui.mode)`.
 */
export type KernelActiveUI = 'none' | 'banner' | 'dialog' | null;

/**
 * Active UI surface once the kernel has resolved (never `null`).
 */
export type ActiveUI = 'none' | 'banner' | 'dialog';

/**
 * Consent state record — which categories are on/off.
 */
export type ConsentState = Record<AllConsentNames, boolean>;

/**
 * Geographic + language + GPC overrides that affect policy evaluation.
 */
export interface KernelOverrides {
	country?: string;
	region?: string;
	language?: string;
	gpc?: boolean;
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
 *
 * v3 does NOT hold every language in the kernel; language switching
 * rerequests init (or reads the next bundle from an offline transport).
 */
export interface KernelTranslations {
	language: string;
	translations: TranslationsResponse;
}

/**
 * IAB TCF state, populated when the `/init` response carries a GVL and
 * the kernel is running in `model === 'iab'`. Mutations go through
 * `kernel.set.iab(patch)` — the IAB module at `@c15t/core/modules/iab`
 * is the primary writer.
 */
export interface KernelIABState {
	/** Whether IAB mode is active. False even when fields are populated
	 * if the consumer has explicitly disabled IAB. */
	enabled: boolean;
	/** Global Vendor List (IAB-registered vendors + purposes). */
	gvl: GlobalVendorList | null;
	/** Non-IAB vendors declared by the publisher. */
	customVendors: NonIABVendor[];
	/** CMP ID registered with IAB Europe. */
	cmpId: number | null;
	/** Per-vendor consent (vendorId → boolean). String keys to match
	 * IAB's numeric-string vendor IDs + custom string IDs uniformly. */
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
 * The snapshot returned by `getSnapshot()` and passed to subscribers.
 * Frozen for cheap reference-equality checks; adapters can use `===` to
 * skip work. Mutating a snapshot throws in strict mode and is meaningless
 * in loose mode.
 */
export interface ConsentSnapshot {
	// -- Core consent state --------------------------------------------------
	readonly consents: Readonly<ConsentState>;
	readonly overrides: Readonly<KernelOverrides>;
	readonly user: Readonly<KernelUser> | null;
	readonly hasConsented: boolean;
	/** Monotonic revision, bumps on every mutation. */
	readonly revision: number;

	/** Subject ID used for append-only consent writes. Generated lazily. */
	readonly subjectId: string | null;

	// -- Init-response derived state -----------------------------------------
	/** Geographic context reported by the backend. */
	readonly location: Readonly<LocationResponse> | null;
	/** Resolved translation bundle. */
	readonly translations: Readonly<KernelTranslations> | null;
	/** Branding identifier. */
	readonly branding: KernelBranding | null;
	/** Full resolved policy object from `/init` (or synthesized offline). */
	readonly policy: Readonly<ResolvedPolicy> | null;
	/** Explainability metadata for how the policy was matched. */
	readonly policyDecision: Readonly<PolicyDecision> | null;
	/** Signed token for write-time consistency — sent back on save. */
	readonly policySnapshotToken: string | null;

	// -- Derived from policy + iab.enabled -----------------------------------
	/** Effective consent model. */
	readonly model: KernelModel;
	/** Which UI surface should render, if any. */
	readonly activeUI: KernelActiveUI;
	/**
	 * `true` while the policy in the snapshot is a placeholder awaiting the
	 * transport's init resolution (e.g. the React provider's synthetic
	 * categories policy in hosted mode). While provisional, `activeUI`
	 * stays `'none'` — surfaces must not render from copy or actions that
	 * an in-flight `/init` may replace. Cleared only after init succeeds or
	 * when the transport has no init method. A failed backend init leaves the
	 * policy provisional and the UI withheld while the kernel retries.
	 */
	readonly policyProvisional: boolean;
	/** Category allowlist from `policy.consent.categories`. Empty array means "all categories allowed". */
	readonly policyCategories: readonly AllConsentNames[];
	/** `strict` drops out-of-policy categories to false; `permissive` leaves them. */
	readonly policyScopeMode: PolicyScopeMode;
	/** UI hints for the banner surface. */
	readonly policyBanner: Readonly<PolicyUiSurfaceConfig> | null;
	/** UI hints for the dialog surface. */
	readonly policyDialog: Readonly<PolicyUiSurfaceConfig> | null;

	// -- IAB passthrough (null when IAB not enabled) -------------------------
	readonly iab: Readonly<KernelIABState> | null;
}

/**
 * Configuration accepted by `createConsentKernel()`. Pure data — no
 * functions run at construction. A transport, if provided, is held as a
 * handle and only invoked when the corresponding command fires.
 */
export interface KernelConfig {
	/** Initial consent state. Defaults to all-false except `necessary: true`. */
	initialConsents?: Partial<ConsentState>;
	/** Initial geographic / language / GPC context. */
	initialOverrides?: KernelOverrides;
	/** Initial identified user, if known at construction. */
	initialUser?: KernelUser;
	/** Initial subject ID, usually hydrated from stored consent. */
	initialSubjectId?: string;
	/** Whether the user has already made a consent choice. */
	initialHasConsented?: boolean;
	/** Initial translation bundle (e.g. from prefetch). */
	initialTranslations?: KernelTranslations;
	/** Initial location (e.g. from prefetch). */
	initialLocation?: LocationResponse;
	/** Initial branding. */
	initialBranding?: KernelBranding;
	/** Initial resolved policy (e.g. from prefetch). */
	initialPolicy?: ResolvedPolicy;
	/**
	 * Marks `initialPolicy` as a placeholder pending init resolution.
	 * Suppresses `activeUI` until init completes so no surface renders
	 * provisional copy/actions. Defaults to `false`: a policy handed to
	 * the kernel (prefetch, SSR, offline config) is treated as
	 * authoritative and renders immediately.
	 */
	initialPolicyProvisional?: boolean;
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
	initialPolicyDecision?: PolicyDecision;
	/** Initial policy snapshot token. */
	initialPolicySnapshotToken?: string;
	/** Initial IAB slice. Usually set by the IAB module on mount, but
	 * can be prefetched server-side when GVL is known at build time. */
	initialIab?: Partial<KernelIABState>;
	/**
	 * Transport that carries out async commands (init, save, identify).
	 * Optional — without a transport, commands run as no-ops and return
	 * minimal success results. The v3 hosted transport lives at
	 * `@c15t/core/transports/hosted`; offline at `@c15t/core/transports/offline`.
	 */
	transport?: KernelTransport;
}

/**
 * Context passed to `transport.init()`. Gives the transport everything it
 * needs to build a fetch request without the transport calling back into
 * the kernel directly.
 */
export interface InitContext {
	overrides: Readonly<KernelOverrides>;
	user: Readonly<KernelUser> | null;
}

/**
 * Response from `transport.init()`. Any field may be omitted; omitted
 * fields leave the current snapshot value alone. Hosted and offline
 * transports emit the same shape — the only difference is where the
 * data comes from (backend vs. client policy-pack resolution).
 */
export interface InitResponse {
	// -- Scope already supported in the MVP transport ------------------------
	/** Geographic context the transport resolved (e.g. from IP lookup). */
	resolvedOverrides?: KernelOverrides;
	/** Server-side consent state, if the user is already identified. */
	consents?: Partial<ConsentState>;
	/** Server-side hasConsented hint. */
	hasConsented?: boolean;
	/** Server-side subject ID, if the user already has one. */
	subjectId?: string;

	// -- New in the rich-init phase ------------------------------------------
	/** Geographic context reported by the transport (country + region). */
	location?: LocationResponse;
	/** Resolved translation bundle. */
	translations?: KernelTranslations;
	/** Branding preference. */
	branding?: KernelBranding;
	/** Full resolved policy object. Drives `model`, `activeUI`,
	 * `policyCategories`, `policyScopeMode`, `policyBanner`, `policyDialog`,
	 * preselected consents. */
	policy?: ResolvedPolicy;
	/** Explainability metadata for policy resolution. */
	policyDecision?: PolicyDecision;
	/** Signed token for write-time consistency. Sent back on save. */
	policySnapshotToken?: string;

	// -- IAB passthrough -----------------------------------------------------
	/** Global Vendor List. `null` (or absent on a 200 response) means the
	 * server has disabled IAB for this request; the IAB module must
	 * self-disable. */
	gvl?: GlobalVendorList | null;
	/** Non-IAB vendors configured on the backend. */
	customVendors?: NonIABVendor[];
	/** CMP ID registered with IAB Europe. */
	cmpId?: number;
}

/**
 * Payload passed to `transport.save()`. Current snapshot's consents at the
 * time the kernel commits, plus the policy snapshot token (if any) so the
 * backend can reject writes against stale policies.
 */
export interface SavePayload {
	subjectId: string;
	consents: Readonly<ConsentState>;
	overrides: Readonly<KernelOverrides>;
	user: Readonly<KernelUser> | null;
	model: KernelModel;
	uiSource: KernelActiveUI;
	consentAction: 'all' | 'necessary' | 'custom';
	policySnapshotToken: string | null;
	/** TC string emitted by the IAB module; absent in non-IAB flows. */
	tcString?: string | null;
	/**
	 * Epoch milliseconds when the visitor made this decision. The save command
	 * sets it once, before the first transport attempt, and a queued replay
	 * reuses it so the backend records the original decision time and derives
	 * the same consent id instead of a duplicate.
	 */
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
}

/**
 * Kernel event surface. Stable event names. Adapters and observability
 * integrations subscribe via `kernel.events.on(name, listener)`.
 */
export type KernelEvent =
	| { type: 'consent:set'; snapshot: ConsentSnapshot }
	| { type: 'overrides:set'; snapshot: ConsentSnapshot }
	| { type: 'user:identified'; snapshot: ConsentSnapshot }
	| { type: 'iab:set'; snapshot: ConsentSnapshot }
	| { type: 'init:applied'; snapshot: ConsentSnapshot }
	| {
			/** Transport initialization failed and the provisional UI stayed hidden. */
			type: 'init:failed';
			/** Error thrown by the transport. */
			error: unknown;
			/** One-based attempt number. */
			attempt: number;
			/** Scheduled retry delay, or `null` when no retry remains. */
			nextRetryMs: number | null;
	  }
	| {
			/** A queued consent save was attempted again. */
			type: 'save:replayed';
			/** Subject whose queued payload was replayed. */
			subjectId: string;
			/** Whether the transport accepted the replay. */
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
 * Minimal shape — boot modules can extend this via their own types.
 */
export interface InitResult {
	ok: boolean;
	error?: unknown;
}

/**
 * Result returned by `commands.save()`.
 */
export interface SaveResult {
	ok: boolean;
	subjectId?: string;
}

/**
 * The public kernel contract. This is everything users, adapters, and
 * boot modules see. Intentionally narrow.
 */
export interface ConsentKernel {
	/**
	 * Cancel background retries and remove browser event listeners.
	 * Idempotent. Snapshot reads and explicit commands remain available.
	 */
	dispose: () => void;
	/** Returns the current snapshot. Cheap, non-allocating. */
	getSnapshot: () => ConsentSnapshot;

	/**
	 * Returns the immutable revision-0 snapshot — the state a server render
	 * saw. Hydration-time consumers (React `useSyncExternalStore`'s
	 * `getServerSnapshot`) must render from this, not the live snapshot:
	 * client boot mutations (sync persistence hydrate, eager init) can land
	 * before hydration completes, and rendering the mutated state during
	 * hydration strands server-rendered consent UI as unowned DOM.
	 */
	getServerSnapshot: () => ConsentSnapshot;

	/**
	 * Subscribe to snapshot changes. Called with the new snapshot on
	 * every state mutation. Returns an unsubscribe function.
	 */
	subscribe: (listener: Listener<ConsentSnapshot>) => Unsubscribe;

	/**
	 * Sync mutations. Return nothing; notify subscribers synchronously.
	 * Safe to call during render (no async, no I/O).
	 */
	readonly set: {
		consent: (input: Partial<ConsentState>) => void;
		overrides: (input: KernelOverrides) => void;
		language: (code: string) => void;
		subjectId: (id: string | null) => void;
		hasConsented: (value: boolean) => void;
		/** Set the active UI surface. */
		activeUI: (ui: KernelActiveUI) => void;
		/** Patch the IAB slice. Creates the slice if currently null. */
		iab: (patch: Partial<KernelIABState>) => void;
	};

	/**
	 * Async commands. Return `Promise<Result>`. These are the places
	 * where I/O lives in the v3 API. Adapters call these inside effects.
	 */
	readonly commands: {
		init: () => Promise<InitResult>;
		/**
		 * Apply and persist consent. All/none only change the supplied categories,
		 * falling back to policy categories, or all known categories without a policy.
		 * Hidden values are preserved; partial-policy bulk actions are recorded as custom.
		 * @param input - Explicit values, all/none, or omitted to save current choices.
		 * @param options - Categories displayed by the caller's UI.
		 * @returns SaveResult with ok indicating transport acceptance. Local changes
		 * remain applied on failure. Transport exceptions resolve with ok: false
		 * and queue the payload for retry.
		 */
		save: (
			input?: Partial<ConsentState> | 'all' | 'none',
			/** Categories displayed by the caller's UI. Defaults to the policy scope. */
			options?: { categories?: readonly AllConsentNames[] }
		) => Promise<SaveResult>;
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
