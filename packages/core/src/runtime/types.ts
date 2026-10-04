/**
 * Public option and handle types for `@c15t/core/runtime`.
 *
 * These describe the framework-agnostic consent runtime: everything a
 * provider used to assemble by hand (kernel, persistence, script loader,
 * blockers, IAB, callbacks, window debug) expressed as plain data plus a
 * lifecycle handle. Framework packages extend {@link ConsentRuntimeOptions}
 * with their own UI-only fields rather than restating the shared ones.
 */
import type { PolicyRule, Vendor } from '@c15t/schema/types';
import type { I18nConfig } from '@c15t/translations';

import type { AllConsentNames } from '../consent/consent-types';
import type { StorageConfig } from '../libs/cookie';
import type {
	ConsentExperiment,
	ExperimentArmTheme,
	ExperimentState,
} from '../libs/experiment';
import type { ConsentPresentation } from '../libs/policy-actions';
import type {
	ClearOnRevocationConfig,
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from '../modules/clear-on-revocation/types';
import type {
	IframeBlockerHandle,
	IframeBlockerOptions,
} from '../modules/iframe-blocker/types';
import type {
	NetworkBlockerConfig,
	NetworkBlockerHandle,
	NetworkBlockerOptions,
	NetworkBlockerRule,
} from '../modules/network-blocker/types';
import type {
	PersistenceHandle,
	PersistenceOptions,
} from '../modules/persistence/types';
import type { RevocationReloadOptions } from '../modules/revocation-reload';
import type {
	Script,
	ScriptLoaderDebugEvent,
	ScriptLoaderHandle,
	ScriptLoaderOptions,
} from '../modules/script-loader/types';
import type {
	WindowDebugHandle,
	WindowDebugOptions,
} from '../modules/window-debug/types';
import type { Callbacks } from '../options/callbacks';
import type { IABConfig } from '../options/iab';
import type { User } from '../options/user';
import type { ProviderTransportFactory } from '../transports/mode';
import type {
	ConsentKernel,
	ConsentState,
	GlobalVendorList,
	KernelConfig,
	KernelOverrides,
	KernelUser,
	Unsubscribe,
} from '../types';
import type { RuntimeIABMountOptions } from './iab-mount';

/** Script-loader tuning accepted by {@link ConsentRuntimeOptions}. */
export interface RuntimeScriptLoaderOptions {
	/** Receives every script-loader lifecycle event, for debugging. */
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
}

/** Network-blocker configuration accepted by {@link ConsentRuntimeOptions}. */
export interface RuntimeNetworkBlockerOptions {
	/** Request patterns mapped to the consent category that unblocks them. */
	rules: NetworkBlockerRule[];
	/** Set `false` to keep the module configured but inert. */
	enabled?: boolean;
	/** Log every blocked request to the console. */
	logBlockedRequests?: boolean;
	/** Called with details of each blocked request. */
	onRequestBlocked?: NetworkBlockerConfig['onRequestBlocked'];
}

/** Persistence configuration accepted by {@link ConsentRuntimeOptions}. */
export type RuntimePersistenceOptions = Omit<PersistenceOptions, 'kernel'>;

/**
 * IAB TCF configuration accepted by {@link ConsentRuntimeOptions}.
 *
 * Every field is optional: a hosted backend can supply `cmpId`,
 * `customVendors` and the GVL through `/init`, so the runtime falls back to
 * the kernel snapshot for anything omitted here. Pass `false` to disable.
 */
export type RuntimeIABOptions =
	| (Omit<Partial<IABConfig>, 'gvl'> & {
			/** Pre-fetched Global Vendor List, or `null` for a non-IAB region. */
			gvl?: GlobalVendorList | null;
			/** Override the GVL endpoint. */
			gvlURL?: string;
	  })
	| false;

/**
 * Fully resolved IAB options the runtime hands to {@link ConsentRuntimeIABFactory}.
 *
 * Structurally identical to `CreateIABOptions` in `@c15t/iab`, which
 * `@c15t/core` cannot import: `@c15t/iab` depends on `@c15t/core`.
 */
export interface ConsentRuntimeIABFactoryOptions {
	/** The kernel the CMP binds to. */
	kernel: ConsentKernel;
	/** IAB-registered CMP ID, resolved from options or the kernel snapshot. */
	cmpId: number;
	/** CMP version reported through `__tcfapi`. */
	cmpVersion?: number;
	/** Restricts the vendor list to these vendor IDs. */
	vendors?: number[];
	/** Non-IAB vendors declared by the publisher. */
	customVendors?: IABConfig['customVendors'];
	/** Publisher country code used in the TC string. */
	publisherCountryCode?: string;
	/**
	 * Ignored: c15t always encodes IsServiceSpecific=1.
	 *
	 * @deprecated TCF requires IsServiceSpecific=1. Group-specific scope is
	 * also encoded as 1. Passing `false` logs a warning once and has no
	 * other effect.
	 */
	isServiceSpecific?: boolean;
	/** Publisher restrictions to encode and enforce. */
	publisherRestrictions?: IABConfig['publisherRestrictions'];
	/** Pre-fetched Global Vendor List, or `null` to disable IAB mode. */
	gvl?: GlobalVendorList | null;
	/** Override the GVL endpoint. */
	gvlURL?: string;
}

/**
 * The IAB CMP handle the runtime keeps on {@link ConsentRuntime.iab}.
 *
 * A structural subset of `IABHandle` from `@c15t/iab` — that package's
 * handle is assignable to this one, so consumers can pass `createIAB`
 * straight through.
 */
export interface ConsentRuntimeIABHandle {
	/** Tear down the CMP API + stub and disconnect kernel subscriptions. */
	dispose: () => void;
	/** Set consent for a specific IAB vendor by ID. */
	setVendorConsent: (vendorId: string | number, value: boolean) => void;
	/** Set legitimate interest for a specific IAB vendor. */
	setVendorLegitimateInterest: (
		vendorId: string | number,
		value: boolean
	) => void;
	/** Set consent for a specific IAB purpose (1–11). */
	setPurposeConsent: (purposeId: number, value: boolean) => void;
	/** Set legitimate interest for a specific IAB purpose. */
	setPurposeLegitimateInterest: (purposeId: number, value: boolean) => void;
	/** Opt in/out of a special feature (1 = geo, 2 = device ID). */
	setSpecialFeatureOptIn: (featureId: number, value: boolean) => void;
	/** Flip every vendor + purpose consent to true. */
	acceptAll: () => void;
	/** Flip every vendor + purpose consent to false. */
	rejectAll: () => void;
	/** Encode the current state as a TCF 2.4 string and commit it. */
	generateTCString: () => Promise<string>;
	/** Generate the TC string, commit it, and run the kernel save flow. */
	save: () => Promise<void>;
	/**
	 * Resolves once this handle's methods are real.
	 *
	 * Present only on a lazily-loaded handle (see `createLazyIABFactory`),
	 * where every other method is a no-op until the CMP module lands. A
	 * surface rendering against a borrowed runtime must await this one
	 * rather than its own package's loader: the two are separate factories,
	 * and the local one resolves immediately when it never loaded anything.
	 */
	whenReady?: () => Promise<void>;
}

/**
 * Creates an IAB CMP bound to the runtime's kernel.
 *
 * `createIAB` from `@c15t/iab` satisfies this signature. It is injected
 * rather than imported because `@c15t/iab` depends on `@c15t/core`.
 */
export type ConsentRuntimeIABFactory = (
	options: ConsentRuntimeIABFactoryOptions
) => ConsentRuntimeIABHandle;

/** External CMP decision source. The provider owns UI, persistence, expiry and GPC. */
export interface ExternalConsentSource {
	/** Read the current decision. Null means not ready, so optional categories are denied. */
	getPermissions: () => Partial<ConsentState> | null;
	/** Notify on initialization, changes, revocation and expiry. Returns cleanup. */
	subscribe: (listener: () => void) => Unsubscribe;
	/** Open the external provider's preference UI. */
	openPreferences: () => void | Promise<void>;
}

/**
 * Server-prepared kernel configuration a runtime starts from. An
 * `experiment` the server resolved runs instead of the `experiment` option.
 */
export type RuntimePrefetch = Omit<KernelConfig, 'transport' | 'initialDraft'> &
	ExperimentState;

/**
 * The browser modules a runtime mounts, as factories.
 *
 * `createConsentRuntime` mounts `defaultRuntimeModules`.
 * `createConsentProviderRuntime` takes them from the caller, so a host can
 * hand in factories that load their module with a dynamic `import()` (see
 * `lazyRuntimeModule`) and keep it out of its first-load JavaScript. A
 * factory must return its handle synchronously; a lazy one returns a
 * stand-in that queues calls until the module lands.
 */
export interface ConsentRuntimeModules {
	/** Mounted on `start()` while enabled, unless `persistence: false`. */
	createPersistence: (options: PersistenceOptions) => PersistenceHandle;
	/** Mounted on `start()` when `scripts` is not empty, enabled or not. */
	createScriptLoader: (options: ScriptLoaderOptions) => ScriptLoaderHandle;
	/** Mounted on `start()` while enabled when `networkBlocker` is set. */
	createNetworkBlocker: (
		options: NetworkBlockerOptions
	) => NetworkBlockerHandle;
	/** Mounted on `start()` while enabled unless `iframeBlocker: false`. */
	createIframeBlocker: (options: IframeBlockerOptions) => IframeBlockerHandle;
	/** Mounted on `start()` while enabled when `clearOnRevocation` is set. */
	createClearOnRevocation: (
		options: ClearOnRevocationOptions
	) => ClearOnRevocationHandle;
	/**
	 * Attached at construction. It reads the synchronous
	 * `save:started → recorded → completed` sequence, so it has to be in
	 * place before the first save: pass the real `watchRevocationReload`.
	 */
	watchRevocationReload: (options: RevocationReloadOptions) => () => void;
	/** Mounted on `start()` unless `windowDebug: false`. */
	createWindowDebug: (options: WindowDebugOptions) => WindowDebugHandle;
	/**
	 * Connects a `consentSource` on `start()` while enabled. Pass
	 * `connectConsentSource` from `@c15t/core/runtime/controls`, or a
	 * wrapper that imports it on demand: until it connects, the kernel
	 * grants no optional category.
	 */
	connectConsentSource: (
		kernel: ConsentKernel,
		source: ExternalConsentSource
	) => Unsubscribe;
	/**
	 * Mounts the IAB CMP on `start()` while enabled, when the options set
	 * `iab` and `createIAB`. Pass `mountRuntimeIAB` from `@c15t/core/runtime`
	 * (`defaultRuntimeModules` does). Without it `iab` is ignored, so a host
	 * that renders IAB another way ships none of the mounting code.
	 */
	mountIAB?: (options: RuntimeIABMountOptions) => () => void;
	/**
	 * Lets the provider runtime accept a `prefetch` that is still a promise.
	 * Pass `streamPrefetch` from `@c15t/core/runtime`. Without it a pending
	 * prefetch is ignored (with a warning outside production) and the runtime
	 * requests the policy itself, so hosts that never stream ship none of it.
	 */
	streamPrefetch?: (
		mode: ProviderTransportFactory,
		prefetch: PromiseLike<RuntimePrefetch>,
		options: Pick<ConsentProviderRuntimeOptions, 'experiment' | 'overrides'>,
		getKernel: () => ConsentKernel | undefined
	) => ProviderTransportFactory;
}

/**
 * Framework-independent lifecycle options. Adapters add presentation options.
 * External sources are initial-only; recreate the runtime to change authority.
 */
export interface ConsentRuntimeOptions {
	/** External authority. Disables c15t persistence, initialization, IAB and choice UI. */
	consentSource?: ExternalConsentSource;
	/**
	 * Set `false` to grant every category, suppress all UI and skip
	 * initialization. Consent-gated scripts load immediately, as they would
	 * for a visitor who accepted everything; persistence, IAB and the
	 * blockers stay unmounted. Defaults to `true`.
	 */
	enabled?: boolean;
	/**
	 * Transport factory the runtime builds its kernel with. Required.
	 *
	 * Pass `hosted()` to talk to a c15t backend, `offline()` to resolve
	 * policies locally with no network, or `custom()` to supply your own
	 * kernel transport or v2 endpoint handlers. This is an initial-only
	 * option: create a new runtime to change it.
	 */
	mode: ProviderTransportFactory;
	/** Cookie/localStorage naming and lifetime for stored consent. */
	storageConfig?: StorageConfig;
	/**
	 * Delete configured first-party cookies and Web Storage entries when their
	 * category loses permission, and once on startup for denied categories.
	 * Cleanup waits for policy resolution. Initial-only; omitted disables it.
	 */
	clearOnRevocation?: ClearOnRevocationConfig;
	/**
	 * Reload the page after an accept, reject or save turns off a category or
	 * vendor that was granted, or after a `consentSource` withdraws one.
	 * Removing a script cannot stop code that already ran, so the reload
	 * starts a document with only permitted code. Waits for the save request.
	 * Set `false` to handle revocation yourself.
	 * @default true
	 */
	reloadOnConsentRevoked?: boolean;
	/** Subject identity forwarded to the backend on `identify`. */
	user?: User | KernelUser;
	/** Decision inputs (country, region, language, GPC) forced by the host. */
	overrides?: KernelOverrides;
	/**
	 * Server-prefetched kernel configuration, for SSR without a flash. An
	 * `experiment` the server resolved runs instead of the `experiment`
	 * option. With a resolved policy, `start()` adopts it instead of sending
	 * the `/init` request. The provider runtime also accepts a promise.
	 */
	prefetch?: RuntimePrefetch;
	/** Host presentation, separate from policy semantics. */
	presentation?: ConsentPresentation;
	/**
	 * A/B experiment on prompt/preferences presentation. The assigned arm is
	 * merged over `presentation`, recorded on `snapshot.experiment`, and
	 * saved with every choice as `metadata.experiment`.
	 */
	experiment?: ConsentExperiment;
	/**
	 * The host theme tokens. The runtime renders nothing with them; it only
	 * merges each experiment arm's `theme` over them so arm validation sees
	 * the `consentActions` the arm will render with. Framework packages
	 * narrow this to their `Theme` type and render it.
	 */
	theme?: ExperimentArmTheme;
	/** Lifecycle callbacks invoked as consent is fetched, set and changed. */
	callbacks?: Pick<
		Callbacks,
		| 'onChoiceRecorded'
		| 'onPermissionsChanged'
		| 'onSurfaceShown'
		| 'onError'
		| 'onBeforeConsentRevocationReload'
	>;
	/** Consent-gated scripts the loader mounts as categories are granted. */
	scripts?: Script[];
	/**
	 * Vendors offered for vendor-level consent outside IAB.
	 *
	 * Each vendor sits inside a category. A subject can grant the category
	 * and still turn one vendor off; scripts, network rules and iframes that
	 * name the vendor through `vendor` / `data-vendor` then stay blocked.
	 * Declarations merge with vendors the backend returns from `/init` and
	 * with slugs found on scripts and rules. Presentation declared here wins
	 * over the backend's. Unrelated to `iab.vendors` and `iab.customVendors`,
	 * which speak the TCF vocabulary and only matter under an `iab` policy.
	 */
	vendors?: Vendor[];
	/**
	 * Content Security Policy nonce applied to DOM nodes c15t injects.
	 *
	 * Set this when your CSP uses a nonce-based policy instead of
	 * `'unsafe-inline'`. The script loader stamps it on every `<script>` it
	 * creates, and framework providers apply it to the injected theme
	 * `<style>` element. A per-script `nonce` takes precedence.
	 */
	nonce?: string;
	/** Script-loader tuning. */
	scriptLoader?: RuntimeScriptLoaderOptions;
	/** Consent-gate outbound requests. Omitted or `false` disables it. */
	networkBlocker?: RuntimeNetworkBlockerOptions | false;
	/**
	 * Consent-gate iframes (YouTube, maps, social embeds). Enabled by
	 * default; pass `false` to opt out.
	 */
	iframeBlocker?: Omit<IframeBlockerOptions, 'kernel'> | false;
	/** IAB TCF configuration. Requires {@link ConsentRuntimeOptions.createIAB}. */
	iab?: RuntimeIABOptions;
	/**
	 * `createIAB` from `@c15t/iab`. Injected so `@c15t/core` does not depend
	 * on its own dependent. Without it `iab` is ignored.
	 */
	createIAB?: ConsentRuntimeIABFactory;
	/**
	 * Storage persistence. `true`/omitted hydrates from cookie +
	 * localStorage on start and reconciles with other tabs; `false` disables
	 * storage entirely. Pass `{ sync: false }` to keep storage but reconcile
	 * only through {@link ConsentRuntime.reconcileStorage}.
	 */
	persistence?: boolean | RuntimePersistenceOptions;
	/** Ordered policy rules evaluated by local transports. */
	policyRules?: PolicyRule[];
	/** Locale and message overrides merged over the bundled translations. */
	i18n?: Partial<I18nConfig>;
	/** Categories to offer alongside discovered integration categories, within policy scope. */
	consentCategories?: AllConsentNames[];
	/**
	 * Install the `window.c15t` debug object (`{ version, pkg, mode }`) on
	 * `start()`. Defaults to `true`. A host that owns `window.c15t` itself,
	 * such as the script-tag build, turns it off.
	 */
	windowDebug?: boolean;
	/**
	 * Package name reported through `window.c15t` — for example
	 * `'@c15t/svelte'`. Defaults to `'@c15t/core'`.
	 */
	pkg?: string;
}

/**
 * Options of {@link ConsentProviderRuntime}: everything
 * {@link ConsentRuntimeOptions} takes, and a `prefetch` that may still be a
 * promise.
 *
 * Options {@link ConsentProviderRuntime.update} applies to a running
 * runtime: `enabled`, `user`, `overrides`, `consentCategories`, `scripts`,
 * `vendors`, `networkBlocker`, `iframeBlocker`, `callbacks` and
 * `reloadOnConsentRevoked`. `nonce`, `scriptLoader.onDebug` and the
 * network blocker's `logBlockedRequests` and `onRequestBlocked` are read
 * when their module mounts. Every other option is read once, storage
 * included (`persistence`, `storageConfig`): create a new runtime to
 * change it.
 */
export interface ConsentProviderRuntimeOptions extends Omit<
	ConsentRuntimeOptions,
	'prefetch'
> {
	/**
	 * Server-prefetched kernel configuration, as on
	 * {@link ConsentRuntimeOptions.prefetch}, or the pending promise of one.
	 *
	 * A promise lets the host render before the server result arrives
	 * (React streams it through Suspense); it needs `streamPrefetch` in the
	 * runtime's modules. The runtime starts with a
	 * provisional policy, so no consent surface shows, and its first
	 * `init()` applies the resolved config in place of the network request.
	 * A config that resolves without a policy is applied as a baseline and
	 * the transport's init runs; a rejected promise falls through to the
	 * transport's init. A streamed experiment arrives too late to run.
	 */
	prefetch?: RuntimePrefetch | PromiseLike<RuntimePrefetch>;
}

/**
 * The option set {@link ConsentProviderRuntime.update} takes: the whole
 * current options, the way a component re-renders with all of its props.
 * `mode` may be left out; it is read once.
 */
export type ConsentRuntimeUpdate = Omit<ConsentProviderRuntimeOptions, 'mode'> &
	Partial<Pick<ConsentProviderRuntimeOptions, 'mode'>>;

/**
 * A started or startable consent runtime.
 *
 * Construction is SSR-safe and free of storage and DOM side effects, so a server can read
 * `kernel.getSnapshot()` immediately. {@link ConsentRuntime.start} owns
 * every browser side effect and {@link ConsentRuntime.dispose} undoes them
 * in reverse.
 */
export interface ConsentRuntime {
	/** The consent kernel. Adapters subscribe to it for reactivity. */
	readonly kernel: ConsentKernel;
	/**
	 * The experiment this runtime validates, assigns and attributes: the one
	 * a ready `prefetch` carries, otherwise the `experiment` option. Hosts
	 * resolve presentation and theme against it.
	 */
	readonly experiment: ConsentExperiment | undefined;
	/**
	 * Clear receipts, identity and persisted records.
	 *
	 * Runs one sequence: through persistence when it is mounted (storage,
	 * then memory), otherwise in memory. Either way it ends with the
	 * `records:cleared` event, which drops the cleared subject's queued saves.
	 */
	clearRecords: () => void;
	/**
	 * Show the consent copy in another language.
	 *
	 * A no-op when it is already the language. Otherwise the language is set
	 * and, while enabled and not under an external `consentSource`, `init()`
	 * runs again so a backend can answer in it.
	 */
	setLanguage: (language: string) => void;
	/** The mounted IAB CMP, or `null` while IAB is off or not yet ready. */
	readonly iab: ConsentRuntimeIABHandle | null;
	/**
	 * Categories surfaced in the UI: `necessary` plus the choice scope, in
	 * the fixed order of `consentTypes`, as the preference draft lists them.
	 * See {@link ConsentRuntime.setConsentCategories}.
	 */
	readonly consentCategories: AllConsentNames[];
	/** Whether {@link ConsentRuntime.start} has run and not been disposed. */
	readonly started: boolean;
	/**
	 * Mount every browser side effect: persistence, script loader, network
	 * and iframe blockers, IAB, `window.c15t`, and the initial
	 * `kernel.commands.init()`, or the adoption of a resolved prefetch
	 * (evaluated at the server's clock, marked live, GPC honoured,
	 * `init:applied` replayed) in its place.
	 *
	 * Idempotent, and a no-op when there is no `document` — call it
	 * unconditionally from a mount hook. Calling it before the first render
	 * is fine when there is no server-rendered markup to hydrate (a client-
	 * only app): the `/init` request then overlaps the mount instead of
	 * waiting for it, and nothing blocks the render. With server markup,
	 * call it after hydration so the first client render matches the server.
	 */
	start: () => void;
	/** Tear down everything {@link ConsentRuntime.start} mounted, in reverse, then the kernel. */
	dispose: () => void;
	/**
	 * Identify the current subject with the backend.
	 *
	 * Rejections are swallowed: failures surface through the `command:error`
	 * event and the `onError` callback.
	 */
	identify: (user: User | KernelUser | undefined) => Promise<void>;
	/** Replace the kernel's decision-input overrides. */
	setOverrides: (overrides: KernelOverrides) => void;
	/**
	 * Re-run `kernel.commands.init()` and evaluate the current records. A no-op when `enabled` is `false`.
	 *
	 * Does not read storage. Use {@link ConsentRuntime.reconcileStorage} for
	 * records another runtime changed.
	 */
	reinit: () => Promise<void>;
	/**
	 * Read stored consent records again and apply what another runtime
	 * changed, such as a denial saved or records cleared in another tab.
	 *
	 * With persistence on, the runtime already does this when another tab
	 * changes c15t's localStorage keys, when the page becomes visible and
	 * when the window regains focus (see `persistence.sync`). Call it
	 * yourself after a change no browser event reports: a second runtime
	 * on the same page, or cookies rewritten without a localStorage change.
	 *
	 * This runtime's queued writes land first. Category decisions then
	 * merge per category, keeping the newer decision for each; a stored
	 * notice or vendor record replaces the in-memory one unless it is older.
	 * A record removed from storage since this runtime last read or wrote it
	 * is cleared so the active policy applies, and unreadable storage
	 * changes nothing. Subscribers are notified once when anything changed.
	 *
	 * @returns Whether any in-memory record changed. `false` before
	 * {@link ConsentRuntime.start}, after {@link ConsentRuntime.dispose}, and
	 * when persistence is off or the runtime is disabled.
	 *
	 * @example
	 * ```ts
	 * // The response sets the consent cookie; no browser event reports it.
	 * await fetch('/account/restore-consent', { method: 'POST' });
	 * runtime.reconcileStorage();
	 * ```
	 */
	reconcileStorage: () => boolean;
	/**
	 * Scan every iframe in the document and apply the current consent to
	 * it: pause gated frames that are not allowed, restore the ones that
	 * are. The blocker does this on its own unless
	 * `iframeBlocker.disableAutomaticBlocking` is set; with it set, call this
	 * after adding frames and after consent changes.
	 *
	 * A no-op before {@link ConsentRuntime.start}, after
	 * {@link ConsentRuntime.dispose}, and when `iframeBlocker` is `false` or
	 * the runtime is disabled.
	 *
	 * @example
	 * ```ts
	 * const runtime = createConsentRuntime({
	 *   iframeBlocker: { disableAutomaticBlocking: true },
	 *   mode: offline(),
	 * });
	 * runtime.start();
	 * container.append(embed);
	 * runtime.processIframes();
	 * ```
	 */
	processIframes: () => void;
	/**
	 * Replace configured categories; retain categories discovered from
	 * integrations. `undefined` drops the configured list.
	 */
	setConsentCategories: (categories: AllConsentNames[] | undefined) => void;
	/**
	 * Subscribe to {@link ConsentRuntime.iab} changing: mounted, replaced or
	 * removed. Read it again in the listener. Consent state changes arrive
	 * through `kernel.subscribe`, not here.
	 */
	subscribe: (listener: () => void) => Unsubscribe;
}

/**
 * A runtime for a framework provider: a {@link ConsentRuntime} whose
 * options follow the component's props.
 *
 * Built by `createConsentProviderRuntime`. It adds what a component needs
 * and a page-level host does not: {@link ConsentProviderRuntime.update} for
 * new props, the `enabled` toggle, and a `prefetch` that may still be
 * streaming. Hosts that configure once use `createConsentRuntime` and do
 * not load this code.
 */
export interface ConsentProviderRuntime extends ConsentRuntime {
	/**
	 * The consent kernel. Adapters subscribe to it for reactivity.
	 *
	 * While the runtime is disabled this is a separate permissive kernel, so
	 * turning `enabled` off and on keeps the visitor's records. It changes
	 * only through {@link ConsentProviderRuntime.setEnabled} (or `update`
	 * with a new `enabled`), and {@link ConsentProviderRuntime.subscribe}
	 * reports the change.
	 */
	readonly kernel: ConsentKernel;
	/** Whether consent management is on. See {@link ConsentRuntimeOptions.enabled}. */
	readonly enabled: boolean;
	/**
	 * Turn consent management on or off without a new runtime.
	 *
	 * Off swaps {@link ConsentProviderRuntime.kernel} for a permissive kernel
	 * that grants every category and shows no UI, and unmounts persistence,
	 * the blockers, IAB, data clearing and the experiment. Only the script
	 * loader runs, so gated scripts load. On swaps back and mounts them
	 * again; the runtime then runs `init()`, or adopts its resolved prefetch
	 * again at the current clock. The prompt stays closed until something
	 * opens it. Subscribers of {@link ConsentProviderRuntime.subscribe} are
	 * notified.
	 */
	setEnabled: (enabled: boolean) => void;
	/**
	 * Apply a component's new options.
	 *
	 * Live options (listed on {@link ConsentProviderRuntimeOptions}) are
	 * compared with the previous set and only what changed is applied: a new
	 * user is identified, new overrides are set and `init()` runs again,
	 * vendors are re-declared, scripts and rules go to their modules, a
	 * module turned on or off is mounted or unmounted. Callbacks are always
	 * read from the latest set. A change to `mode`, `i18n`, `experiment`,
	 * `persistence` or `storageConfig` logs a warning outside production.
	 *
	 * New overrides, `enabled` and `consentCategories` apply at once, and
	 * requests that new network blocker rules match are held until the
	 * blocker has those rules. The rest of the comparison loads on demand,
	 * with the first `update()` in which some option is a new value, so
	 * options handed back unchanged load nothing. The returned promise
	 * resolves once every change has applied. It rejects when that module
	 * fails to load: requests held for new rules then fail as blocked, and
	 * the next `update()` loads it again.
	 */
	update: (options: ConsentRuntimeUpdate) => Promise<void>;
	/**
	 * Subscribe to {@link ConsentProviderRuntime.kernel},
	 * {@link ConsentRuntime.iab} or {@link ConsentProviderRuntime.enabled}
	 * changing. Read them again in the listener. Consent state changes
	 * arrive through `kernel.subscribe`, not here.
	 */
	subscribe: (listener: () => void) => Unsubscribe;
}
