/**
 * Public option and handle types for `@c15t/core/runtime`.
 *
 * These describe the framework-agnostic consent runtime: everything a
 * provider used to assemble by hand (kernel, persistence, script loader,
 * blockers, IAB, callbacks, window debug) expressed as plain data plus a
 * lifecycle handle. Framework packages extend {@link ConsentRuntimeOptions}
 * with their own UI-only fields rather than restating the shared ones.
 */
import type { PolicyConfig } from '@c15t/schema/types';
import type { I18nConfig } from '@c15t/translations';

import type { AllConsentNames } from '../consent/consent-types';
import type { StorageConfig } from '../libs/cookie';
import type { IframeBlockerOptions } from '../modules/iframe-blocker';
import type {
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from '../modules/network-blocker';
import type { PersistenceOptions } from '../modules/persistence';
import type { Script, ScriptLoaderDebugEvent } from '../modules/script-loader';
import type { Callbacks } from '../options/callbacks';
import type { IABConfig } from '../options/iab';
import type { OfflinePolicyConfig } from '../options/offline-policy';
import type { User } from '../options/user';
import type { ProviderTransportFactory } from '../transports/mode';
import type {
	ConsentKernel,
	GlobalVendorList,
	KernelConfig,
	KernelOverrides,
	KernelUser,
	Unsubscribe,
} from '../types';

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
	/** Whether the CMP is service-specific rather than global. */
	isServiceSpecific?: boolean;
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
	/** Encode the current state as a TCF 2.3 string and commit it. */
	generateTCString: () => Promise<string>;
	/** Generate the TC string, commit it, and run the kernel save flow. */
	save: () => Promise<void>;
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

/**
 * Everything the framework-agnostic consent runtime needs.
 *
 * Framework packages extend this with their UI-only options (theme, color
 * scheme, animation, legal links) and forward the rest untouched.
 */
export interface ConsentRuntimeOptions {
	/**
	 * Set `false` to grant every category, suppress all UI and skip every
	 * side-effecting module. Defaults to `true`.
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
	/** Subject identity forwarded to the backend on `identify`. */
	user?: User | KernelUser;
	/** Decision inputs (country, region, language, GPC) forced by the host. */
	overrides?: KernelOverrides;
	/** Server-prefetched kernel configuration, for SSR without a flash. */
	prefetch?: KernelConfig;
	/** Lifecycle callbacks invoked as consent is fetched, set and changed. */
	callbacks?: Callbacks;
	/**
	 * Reload the page when a previously granted category is revoked, so
	 * already-executed trackers stop. Defaults to `true`.
	 */
	reloadOnConsentRevoked?: boolean;
	/** Consent-gated scripts the loader mounts as categories are granted. */
	scripts?: Script[];
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
	 * localStorage on creation; `false` disables storage entirely.
	 */
	persistence?: boolean | RuntimePersistenceOptions;
	/** Policy packs evaluated by the transport. */
	policies?: PolicyConfig[];
	/**
	 * Offline policy preview configuration.
	 *
	 * @remarks
	 * With `offline()` it lets you inject a synthetic resolved policy
	 * (`policy`, `policyDecision`, `policySnapshotToken`) or
	 * backend-compatible `policyPacks` without a live `/init` endpoint.
	 */
	offlinePolicy?: OfflinePolicyConfig;
	/** Locale and message overrides merged over the bundled translations. */
	i18n?: Partial<I18nConfig>;
	/** Categories surfaced in the banner and preference center. */
	consentCategories?: AllConsentNames[];
	/**
	 * Package name reported through `window.c15t` — for example
	 * `'@c15t/svelte'`. Defaults to `'@c15t/core'`.
	 */
	pkg?: string;
}

/**
 * A started or startable consent runtime.
 *
 * Construction is SSR-safe and free of DOM side effects beyond an early
 * cookie hydration in the browser, so a server can read
 * `kernel.getSnapshot()` immediately. {@link ConsentRuntime.start} owns
 * every browser side effect and {@link ConsentRuntime.dispose} undoes them
 * in reverse.
 */
export interface ConsentRuntime {
	/** The consent kernel. Adapters subscribe to it for reactivity. */
	readonly kernel: ConsentKernel;
	/** The mounted IAB CMP, or `null` while IAB is off or not yet ready. */
	readonly iab: ConsentRuntimeIABHandle | null;
	/** Categories surfaced in the UI. See {@link ConsentRuntime.setConsentCategories}. */
	readonly consentCategories: AllConsentNames[];
	/** Whether {@link ConsentRuntime.start} has run and not been disposed. */
	readonly started: boolean;
	/**
	 * Mount every browser side effect: persistence, script loader, network
	 * and iframe blockers, IAB, `window.c15t`, and the initial
	 * `kernel.commands.init()`.
	 *
	 * Idempotent, and a no-op when there is no `document` — call it
	 * unconditionally from a mount hook.
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
	 * Re-run `kernel.commands.init()` and drop the banner when the subject
	 * has already consented. A no-op when `enabled` is `false`.
	 */
	reinit: () => Promise<void>;
	/** Replace the categories surfaced in the UI. */
	setConsentCategories: (categories: AllConsentNames[]) => void;
	/** Subscribe to {@link ConsentRuntime.iab} changing. */
	onIABChange: (
		listener: (handle: ConsentRuntimeIABHandle | null) => void
	) => Unsubscribe;
}
