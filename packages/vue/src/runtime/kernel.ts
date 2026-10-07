/**
 * The Vue side of the consent runtime.
 *
 * `@c15t/core`'s provider runtime owns behaviour: the kernel, persistence,
 * the script loader, the blockers, IAB, callbacks, the prefetch adoption
 * and teardown. This module owns expression: it turns the Vue and Nuxt
 * config into runtime options (the hosted and manifest transports are the
 * runtime's `mode`), and exposes the kernel to components as Vue refs. One
 * runtime serves one app; the plugin provides it through
 * {@link provideVueConsentContext}.
 */
import {
	c15tProtocolHeaders,
	createHostedTransport,
	initOutputToKernelConfig,
	watchRevocationReload,
} from '@c15t/core';
import type {
	ConsentExperiment,
	ConsentKernel,
	ConsentSnapshot,
	HydrationRecords,
	InitResponse,
	KernelActiveUI,
	KernelConfig,
	KernelTransport,
	ProviderTransportFactory,
} from '@c15t/core';
import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
import type { IframeBlockerOptions } from '@c15t/core/modules/iframe-blocker';
import type {
	BlockedRequestInfo,
	NetworkBlockerRule,
} from '@c15t/core/modules/network-blocker';
import { createPersistence } from '@c15t/core/modules/persistence';
import type { StorageConfig } from '@c15t/core/modules/persistence';
import type { Script } from '@c15t/core/modules/script-loader';
import { createWindowDebug } from '@c15t/core/modules/window-debug';
import { createLazyIABFactory, mountRuntimeIAB } from '@c15t/core/runtime';
import type {
	ConsentRuntimeIABHandle,
	GPPModuleLoader,
	RuntimeGPPOptions,
} from '@c15t/core/runtime';
import { onDemandRuntimeModules } from '@c15t/core/runtime/on-demand';
import { createConsentProviderRuntime } from '@c15t/core/runtime/provider';
import type {
	ConsentProviderRuntime,
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeUpdate,
	RuntimePrefetch,
} from '@c15t/core/runtime/provider';
import { showConsentSurface } from '@c15t/core/surface-actions';
import type { ConsentActiveUI } from '@c15t/schema/config';
import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { computed, shallowRef } from 'vue';
import type { App, Ref } from 'vue';

import type * as ClientManifestModule from './client-manifest';
import type { ConsentConfig } from './config';
import {
	isClientManifestModeEnabled,
	isServerManifestModeEnabled,
	resolveClientManifestURL,
} from './manifest';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from './utils/symbols';

export const INIT_HEADER_NAMES = [...CONSENT_REQUEST_HEADER_NAMES] as const;

const INIT_HEADER_ALLOWLIST = new Set<string>(INIT_HEADER_NAMES);

/** Translation, location and branding data for Vue components. Policy lives in the kernel snapshot. */
export type VueConsentDisplayData = Pick<
	InitOutput,
	| 'branding'
	| 'cmpId'
	| 'customVendors'
	| 'gvl'
	| 'gvlReference'
	| 'location'
	| 'translations'
>;

export interface VueConsentKernelContext {
	/**
	 * The runtime this app renders: the one the plugin built, or the one a
	 * host handed it (`ownsKernel` is then `false`).
	 */
	runtime: ConsentRuntime;
	/**
	 * Mounted client CMP handle; absent before mount or outside an IAB
	 * policy. Follows the runtime; assigning replaces it until the runtime
	 * mounts another.
	 */
	iab: ConsentRuntimeIABHandle | undefined;
	/** Clears records through the runtime: storage when mounted, then memory. */
	clearRecords: () => void;
	kernel: ConsentKernel;
	snapshot: Ref<ConsentSnapshot>;
	init: Ref<VueConsentDisplayData | undefined>;
	activeUI: Ref<ConsentActiveUI>;
	storedConsent: Readonly<Ref<ConsentSnapshot['explicitChoice']>>;
	ownsKernel: boolean;
	/**
	 * The experiment the runtime validates, assigns and attributes.
	 * Presentation and theme resolve against it too; a later config change
	 * is ignored.
	 */
	experimentDefinition?: ConsentExperiment;
	/**
	 * Mount the browser side of a runtime this app owns: persistence, the
	 * blockers, IAB, `window.c15t`, and the first `/init` (or the adoption
	 * of a server-resolved prefetch). A no-op on the server, when already
	 * started, and for a borrowed runtime, whose host starts it.
	 */
	start: () => void;
	/**
	 * Change the decision-input overrides (country, region, language) and
	 * ask for the policy again once the runtime runs. Before
	 * {@link VueConsentKernelContext.start} the first `/init` carries them.
	 */
	setOverrides: (
		overrides: Pick<
			ConsentSnapshot['overrides'],
			'country' | 'language' | 'region'
		>
	) => void;
	/**
	 * Apply a new config to a runtime this app owns: scripts, network and
	 * iframe blocking, vendors, categories, callbacks and the reload rule
	 * follow it. Storage, transport and experiment options are read once.
	 */
	update: (config: RuntimeConsentConfig) => void;
	dispose: () => void;
}

/**
 * Network-blocker options, mirroring `UseNetworkBlockerOptions` in
 * `@c15t/react` (v3 provider) and `@c15t/svelte`.
 */
export interface UseNetworkBlockerOptions {
	rules: NetworkBlockerRule[];
	enabled?: boolean;
	logBlockedRequests?: boolean;
	onRequestBlocked?: (info: BlockedRequestInfo) => void;
}

export type RuntimeConsentConfig = ConsentConfig & {
	scripts?: Script[];
	/**
	 * Content Security Policy nonce stamped on every `<script>` the script
	 * loader creates. A per-script `nonce` takes precedence.
	 */
	nonce?: string;
	storageConfig?: StorageConfig;
	customFetch?: typeof fetch;
	domain?: string;
	/**
	 * Block matching network requests until the mapped consent category is
	 * granted. Same shape as the react/svelte `networkBlocker` option;
	 * omitted/`false` disables the module.
	 */
	networkBlocker?: UseNetworkBlockerOptions | false;
	/**
	 * Consent-gate iframes (YouTube, maps, social embeds). Enabled by default
	 * to match `@c15t/svelte`; pass `false` to opt out or an options object to
	 * tune automatic blocking.
	 */
	iframeBlocker?: Omit<IframeBlockerOptions, 'kernel'> | false;
	/**
	 * IAB Global Privacy Platform: install `window.__gpp` once the app
	 * mounts and keep its GPP string in step with the visitor's choices.
	 * `true` or `{}` uses the defaults; omitted or `false` leaves GPP off.
	 * The GPP code loads as its own chunk, only when this is set. A load
	 * failure, or another CMP that already owns `__gpp`, is reported to
	 * `callbacks.onError`. Ignored with `consentSource`, and when the plugin
	 * renders a `runtime` it did not create: set `gpp` on that runtime.
	 *
	 * @example
	 * ```ts
	 * gpp: { usApproach: 'national' }
	 * ```
	 */
	gpp?: RuntimeGPPOptions | boolean;
};

export const pickAllowedInitHeaders = function pickAllowedInitHeaders(
	headers: Record<string, string | undefined>
): Record<string, string> {
	const allowed: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		const normalized = key.toLowerCase();
		if (value && INIT_HEADER_ALLOWLIST.has(normalized)) {
			allowed[normalized] = value;
		}
	}
	return allowed;
};

/**
 * `'manager'` and `null` are the Vue config's names for the kernel's
 * `'dialog'` and `'none'`, kept so `useConsentActiveUI()` reads as before.
 */
const toKernelActiveUI = function toKernelActiveUI(
	ui: ConsentActiveUI
): KernelActiveUI {
	if (ui === 'manager') {
		return 'dialog';
	}
	if (ui === null) {
		return 'none';
	}
	return ui;
};

const toVueActiveUI = function toVueActiveUI(
	ui: KernelActiveUI
): ConsentActiveUI {
	if (ui === 'dialog') {
		return 'manager';
	}
	if (ui === 'none') {
		return null;
	}
	return ui;
};

const DISPLAY_DATA_KEYS = [
	'branding',
	'cmpId',
	'customVendors',
	'gvl',
	'gvlReference',
	'location',
	'translations',
] as const;

/**
 * Keep the previous display data when every field is the same reference, so
 * components reading `useConsentInit()` don't re-render on kernel changes
 * that leave it alone (opening the dialog, a save, a privacy signal).
 */
const reuseDisplayData = function reuseDisplayData(
	next: VueConsentDisplayData | undefined,
	previous: VueConsentDisplayData | undefined
): VueConsentDisplayData | undefined {
	if (
		next &&
		previous &&
		DISPLAY_DATA_KEYS.every((key) => next[key] === previous[key])
	) {
		return previous;
	}
	return next;
};

const snapshotToDisplayData = function snapshotToDisplayData(
	snapshot: ConsentSnapshot
): VueConsentDisplayData | undefined {
	if (!snapshot.location || !snapshot.translations) {
		return undefined;
	}
	return {
		branding: snapshot.branding ?? 'c15t',
		cmpId: snapshot.iab?.cmpId ?? undefined,
		customVendors: snapshot.iab?.customVendors,
		gvl: snapshot.iab?.gvl ?? undefined,
		gvlReference: snapshot.iab?.gvlReference,
		location: snapshot.location,
		translations: snapshot.translations,
	};
};

export const getNuxtInitFetchTarget = function getNuxtInitFetchTarget(
	config: Partial<RuntimeConsentConfig>
):
	| {
			url: string;
			baseURL?: string;
	  }
	| undefined {
	if (isClientManifestModeEnabled(config)) {
		return undefined;
	}
	if (isServerManifestModeEnabled(config)) {
		return {
			url: config.initRoute ?? '/api/c15t/init',
		};
	}
	return {
		baseURL: config.backendURL,
		url: '/init',
	};
};

const getBrowserLanguage = function getBrowserLanguage(): string | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	return navigator.language || navigator.languages?.[0];
};

const getBrowserGpc = function getBrowserGpc(): boolean | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	try {
		const value = (navigator as Navigator & { globalPrivacyControl?: unknown })
			.globalPrivacyControl;
		return typeof value === 'boolean' ? value : undefined;
	} catch {
		return undefined;
	}
};

const getManifestInputs = function getManifestInputs(
	config: RuntimeConsentConfig,
	headers: Record<string, string>
) {
	if (isClientManifestModeEnabled(config)) {
		const contextualHeaders = { ...headers };
		const browserLanguage = getBrowserLanguage();
		if (browserLanguage) {
			contextualHeaders['accept-language'] = browserLanguage;
		}

		const inputs = extractConsentRequestInputs(contextualHeaders);
		return {
			country: null,
			gpc: getBrowserGpc() ?? inputs.gpc,
			language: inputs.language ?? 'en',
			region: null,
		};
	}

	const inputs = extractConsentRequestInputs(headers);
	return {
		country: inputs.country ?? null,
		gpc: inputs.gpc,
		language: inputs.language ?? 'en',
		region: inputs.region ?? null,
	};
};

/**
 * Hosted transport for Nuxt. `initURL` selects server manifest mode: init
 * goes through the same-origin Nuxt route, which resolves the manifest on
 * the server and never issues a policy snapshot token, so saves assert the
 * decision inputs instead. Each init builds its own transport so the
 * override-derived headers apply; saves go through whichever transport
 * completed the latest init so those remembered inputs stay attached.
 */
const createVueHostedTransport = function createVueHostedTransport(
	config: RuntimeConsentConfig,
	headers: Record<string, string>,
	initURL?: string
): KernelTransport {
	const backendURL = config.backendURL ?? '/api/c15t';
	const assertDecisionInputs = initURL !== undefined;
	const baseTransport = createHostedTransport({
		assertDecisionInputs,
		backendURL,
		domain: config.domain,
		fetch: config.customFetch,
		headers,
		initURL,
	});
	let activeTransport = baseTransport;

	return {
		...baseTransport,
		async init(ctx) {
			const initHeaders = { ...headers };
			if (ctx.overrides.language) {
				initHeaders['accept-language'] = ctx.overrides.language;
			}
			if (ctx.overrides.gpc !== undefined) {
				initHeaders['sec-gpc'] = ctx.overrides.gpc ? '1' : '0';
			}
			if (ctx.overrides.country) {
				initHeaders['x-c15t-country'] = ctx.overrides.country;
			}
			if (ctx.overrides.region) {
				initHeaders['x-c15t-region'] = ctx.overrides.region;
			}

			const contextualHeaders = pickAllowedInitHeaders(initHeaders);
			const contextualTransport = createHostedTransport({
				assertDecisionInputs,
				backendURL,
				domain: config.domain,
				fetch: config.customFetch,
				headers: contextualHeaders,
				initURL,
			});
			const response =
				(await contextualTransport.init?.(ctx)) ?? ({} as InitResponse);
			activeTransport = contextualTransport;
			return response;
		},
		save(payload) {
			return activeTransport.save?.(payload) ?? Promise.resolve({ ok: true });
		},
	};
};

type Settled<Value> =
	| { ok: true; value: Value }
	| { ok: false; error: unknown };

const settle = async function settle<Value>(
	promise: Promise<Value>
): Promise<Settled<Value>> {
	try {
		return { ok: true, value: await promise };
	} catch (error) {
		return { error, ok: false };
	}
};

type ClientManifestResources = typeof ClientManifestModule;

let bundledClientManifest: ClientManifestResources | undefined;

/**
 * Hand the kernel client manifest resources that are already part of the
 * app's entry, so it uses them instead of importing its own chunk. Nuxt's
 * client manifest mode registers them from a plugin that imports them
 * statically: that mode resolves the manifest at startup, and a static
 * import lets the page preload the resolver instead of fetching it after
 * the entry runs.
 *
 * @param resources - The `./client-manifest` module, or `undefined` to
 * go back to importing it on demand.
 * @internal
 */
export const registerClientManifest = function registerClientManifest(
	resources: ClientManifestResources | undefined
): void {
	bundledClientManifest = resources;
};

const createVueManifestTransport = function createVueManifestTransport(
	config: RuntimeConsentConfig,
	headers: Record<string, string>,
	prefetch: InitOutput | undefined
): KernelTransport {
	const backendURL = config.backendURL ?? '/api/c15t';
	const manifestURL = resolveClientManifestURL(config);
	const hostedTransport = createHostedTransport({
		backendURL,
		domain: config.domain,
		fetch: config.customFetch,
		headers,
	});
	let manifestTransport: KernelTransport | undefined;

	const fetchManifest =
		async function fetchManifest(): Promise<ConsentManifest> {
			if (config.manifestSnapshot) {
				return config.manifestSnapshot;
			}
			const fetchImpl =
				config.customFetch ?? globalThis.fetch?.bind(globalThis);
			if (!fetchImpl) {
				throw new Error(
					'createManifestTransport: no fetch available. Pass `fetch` in options.'
				);
			}

			const response = await fetchImpl(manifestURL, {
				credentials: 'include',
				headers: {
					accept: 'application/json',
					...c15tProtocolHeaders,
					...headers,
				},
				method: 'GET',
			});
			if (!response.ok) {
				throw new Error(
					`c15t manifest transport: /manifest responded ${response.status} ${response.statusText}`
				);
			}

			return response.json();
		};

	// Settled, never rejecting: a failed eager load must not surface as an
	// unhandled rejection before `init()` awaits it. `init()` rethrows.
	const loadClientResources = function loadClientResources() {
		return settle(
			Promise.all([
				bundledClientManifest ?? import('./client-manifest'),
				fetchManifest(),
			])
		);
	};

	// Started eagerly so the resolver and manifest fetch overlap hydration.
	// A failed load is dropped so the kernel's next init attempt fetches
	// again instead of replaying the cached failure until a page reload.
	let clientResources =
		typeof window === 'undefined' ? undefined : loadClientResources();

	return {
		...hostedTransport,
		async init(ctx) {
			if (typeof window === 'undefined') {
				return {};
			}

			clientResources ??= loadClientResources();
			const loaded = await clientResources;
			if (!loaded.ok) {
				clientResources = undefined;
				throw loaded.error;
			}
			const [{ baseTranslations, createManifestTransport }, manifest] =
				loaded.value;
			manifestTransport ??= createManifestTransport({
				backendURL,
				baseTranslations,
				domain: config.domain,
				fetch: config.customFetch,
				headers,
				initialInit: prefetch,
				inputs: getManifestInputs(config, headers),
				manifest,
				manifestURL,
			});
			return manifestTransport.init?.(ctx) ?? {};
		},
		async save(payload) {
			return (
				(await manifestTransport?.save?.(payload)) ??
				(await hostedTransport.save?.(payload)) ?? { ok: true }
			);
		},
	};
};

/** The runtime `mode` for one Vue config: hosted, or the browser manifest. */
const createVueTransportFactory = function createVueTransportFactory(
	config: RuntimeConsentConfig,
	headers: Record<string, string>,
	prefetch: InitOutput | undefined,
	transport: KernelTransport | undefined
): ProviderTransportFactory {
	const create = (): KernelTransport => {
		if (transport) {
			return transport;
		}
		if (isClientManifestModeEnabled(config)) {
			return createVueManifestTransport(config, headers, prefetch);
		}
		return createVueHostedTransport(
			config,
			headers,
			isServerManifestModeEnabled(config)
				? getNuxtInitFetchTarget(config)?.url
				: undefined
		);
	};
	return Object.assign(create, {
		kind: transport ? ('custom' as const) : ('hosted' as const),
	});
};

/**
 * Records the kernel starts from: the server's cookie read, then what a
 * prefetch named (a subject), then a test's own records.
 */
const mergeRecords = function mergeRecords(
	rawRecords: HydrationRecords | undefined,
	prefetched: HydrationRecords | undefined,
	explicit: HydrationRecords | undefined
): HydrationRecords | undefined {
	if (explicit) {
		return explicit;
	}
	const merged = { ...rawRecords, ...prefetched };
	return Object.keys(merged).length > 0 ? merged : undefined;
};

/**
 * Mount the IAB CMP while the resolved policy uses the `iab` model, through
 * the runtime's IAB mount (publisher options, `normalizeIABOptions`). A
 * backend can return a `cmpId` for every visitor; a visitor whose policy is
 * not IAB gets no `__tcfapi`. A policy that changes away from IAB unmounts
 * the CMP, and a new `cmpId` mounts a new one.
 */
const mountIABUnderIABPolicy: NonNullable<ConsentRuntimeModules['mountIAB']> = (
	options
) => {
	let unmount: (() => void) | null = null;
	let mountedCmpId: number | null = null;
	const sync = () => {
		const snapshot = options.kernel.getSnapshot();
		const cmpId = options.iab.cmpId ?? snapshot.iab?.cmpId;
		const next =
			snapshot.policyRule.model === 'iab' &&
			typeof cmpId === 'number' &&
			Number.isInteger(cmpId) &&
			cmpId > 0
				? cmpId
				: null;
		if (next === mountedCmpId) {
			return;
		}
		unmount?.();
		unmount = null;
		mountedCmpId = next;
		if (next !== null) {
			unmount = mountRuntimeIAB(options);
		}
	};
	sync();
	const unsubscribe = options.kernel.subscribe(sync);
	return () => {
		unsubscribe();
		unmount?.();
		unmount = null;
	};
};

/**
 * The runtime's modules for a Vue app. Persistence, the iframe blocker and
 * `window.c15t` are static: stored choices apply on mount and gated frames
 * pause as soon as the app starts. The script loader, the network blocker
 * (the runtime holds matching requests until it lands), data clearing and
 * a `consentSource` connection load only for apps that configure them,
 * each as one chunk that imports nothing the first load has.
 */
const createVueRuntimeModules = function createVueRuntimeModules(
	windowMode: 'hosted' | 'manifest'
): ConsentRuntimeModules {
	return {
		...onDemandRuntimeModules,
		createIframeBlocker,
		createPersistence,
		// Vue reports its manifest modes as `manifest`, which no transport
		// factory kind names.
		createWindowDebug: (options) =>
			createWindowDebug({ ...options, mode: windowMode }),
		mountIAB: mountIABUnderIABPolicy,
		watchRevocationReload,
	};
};

/**
 * The runtime options a Vue config maps to. Everything but `mode`,
 * `prefetch` and the IAB factory comes from the config, so a new config
 * can go through `update()` unchanged.
 */
/**
 * Loads `@c15t/iab/gpp`, only when `gpp` is set. One function for every
 * call, so passing it to the runtime's `update()` never reads as a change.
 */
const loadGPP: GPPModuleLoader = () => import('@c15t/iab/gpp');

const toRuntimeOptions = function toRuntimeOptions(
	config: RuntimeConsentConfig
): Omit<ConsentRuntimeUpdate, 'createIAB' | 'mode' | 'prefetch'> {
	return {
		callbacks: config.callbacks,
		clearOnRevocation: config.clearOnRevocation,
		consentCategories: config.consentCategories,
		consentSource: config.consentSource,
		experiment: config.experiment,
		gpp: config.gpp,
		// An unset `iab` mounts the CMP from what `/init` returns.
		iab: config.iab ?? {},
		iframeBlocker: config.iframeBlocker,
		loadGPP,
		networkBlocker: config.networkBlocker,
		nonce: config.nonce,
		pkg: '@c15t/vue',
		presentation: config.presentation,
		reloadOnConsentRevoked: config.reloadOnConsentRevoked,
		scripts: config.scripts,
		storageConfig: config.storageConfig,
		theme: config.theme,
		vendors: config.vendors,
	};
};

const normalizeGeoValue = function normalizeGeoValue(
	value: unknown
): string | undefined {
	return typeof value === 'string' && value.trim()
		? value.trim().toUpperCase()
		: undefined;
};

/**
 * Client manifest mode resolves with an unknown location first. With a
 * `geoURL`, fetch the visitor's country and region once that first init
 * settles and resolve again with them.
 */
const refreshClientGeo = async function refreshClientGeo(
	runtime: ConsentRuntime,
	config: RuntimeConsentConfig,
	isActive: () => boolean
): Promise<void> {
	if (!config.geoURL) {
		return;
	}
	try {
		const fetchImpl = config.customFetch ?? globalThis.fetch.bind(globalThis);
		const response = await fetchImpl(config.geoURL, {
			credentials: 'same-origin',
			headers: { accept: 'application/json' },
			method: 'GET',
		});
		if (!response.ok) {
			return;
		}
		const payload = (await response.json()) as {
			country?: unknown;
			region?: unknown;
		};
		const country = normalizeGeoValue(payload.country);
		const region = normalizeGeoValue(payload.region);
		// The runtime may have been torn down while the geo fetch was in
		// flight; re-arming a disposed kernel would leak its retry listeners.
		if (!(country || region) || !isActive()) {
			return;
		}
		const overrides: { country?: string; region?: string } = {};
		if (country) {
			overrides.country = country;
		}
		if (region) {
			overrides.region = region;
		}
		runtime.setOverrides(overrides);
		await runtime.reinit();
	} catch {
		// Keep the manifest's unknown-location result when the optional geo
		// microfetch is unavailable.
	}
};

/** What {@link createVueConsentKernelContext} builds a context from. */
export interface VueConsentContextOptions {
	config: RuntimeConsentConfig;
	/** The request's consent headers (Nuxt), for init and the manifest inputs. */
	headers?: Record<string, string | undefined>;
	/** A resolved `/init` answer to start from (`config.prefetch` otherwise). */
	prefetch?: InitOutput;
	/**
	 * The state a server render resolved for this request (Nuxt), used in
	 * place of `prefetch`: the init is already folded in.
	 */
	prefetchState?: KernelConfig;
	/**
	 * Records the server read from the request cookie. They seed the kernel,
	 * and persistence applies only newer stored denials over them.
	 */
	initialRecords?: HydrationRecords;
	/** The evaluation clock the records were read at. */
	now?: number;
	/**
	 * Kernel configuration merged over the prefetch; a `transport` replaces
	 * the hosted or manifest one. A test seam.
	 *
	 * @internal
	 */
	kernelConfig?: KernelConfig;
	producerContract?: number | null;
	/** A runtime the host owns. The context renders it and starts nothing. */
	runtime?: ConsentRuntime;
}

/**
 * Build the runtime for a Vue app, or wrap the one a host handed in, and
 * expose its kernel as Vue refs.
 *
 * SSR-safe: construction touches no storage and no DOM. Call
 * {@link VueConsentKernelContext.start} in the browser, after hydration
 * when there is server markup, and {@link VueConsentKernelContext.dispose}
 * when the app unmounts.
 *
 * @param options - The config and what the server resolved.
 * @returns The context the plugin provides to components.
 */
// oxlint-disable-next-line max-lines-per-function -- One runtime, its refs and their lifecycle.
export const createVueConsentKernelContext =
	function createVueConsentKernelContext(
		options: VueConsentContextOptions
	): VueConsentKernelContext {
		const { config } = options;
		const borrowed = options.runtime;
		let owned: ConsentProviderRuntime | undefined;
		let createIAB: ConsentRuntimeUpdate['createIAB'];
		if (!borrowed) {
			const headers = pickAllowedInitHeaders(options.headers ?? {});
			const initOutput = options.prefetch ?? config.prefetch;
			const { transport, ...kernelConfig } = options.kernelConfig ?? {};
			const initialConfig =
				options.prefetchState ??
				initOutputToKernelConfig(initOutput, headers, {
					producerContract: options.producerContract,
				});
			const rawRecords = options.initialRecords ?? config.initialRecords;
			const prefetch: RuntimePrefetch = {
				...initialConfig,
				...kernelConfig,
				initialRecords: mergeRecords(
					rawRecords,
					initialConfig.initialRecords,
					kernelConfig.initialRecords
				),
				now:
					kernelConfig.now ??
					options.now ??
					rawRecords?.now ??
					initialConfig.now,
			};
			const runtimeOptions = toRuntimeOptions(config);
			// The app's own IAB CMP loads on demand; `iab: false` loads none.
			createIAB =
				runtimeOptions.iab === false
					? undefined
					: createLazyIABFactory(() => import('@c15t/iab')).create;
			owned = createConsentProviderRuntime(
				{
					...runtimeOptions,
					createIAB,
					mode: createVueTransportFactory(
						config,
						headers,
						initOutput,
						transport
					),
					prefetch,
				},
				createVueRuntimeModules(
					isClientManifestModeEnabled(config) ||
						isServerManifestModeEnabled(config)
						? 'manifest'
						: 'hosted'
				)
			);
		}
		const runtime: ConsentRuntime = borrowed ?? (owned as ConsentRuntime);
		// No `enabled` toggle in the Vue config, so the kernel never swaps.
		const { kernel } = runtime;

		const snapshot = shallowRef(kernel.getSnapshot());
		const unsubscribe = kernel.subscribe((next) => {
			snapshot.value = next;
		});
		const iab = shallowRef(runtime.iab ?? undefined);
		const unsubscribeIab = runtime.subscribe(() => {
			iab.value = runtime.iab ?? undefined;
		});

		const init = computed<VueConsentDisplayData | undefined>((previous) =>
			reuseDisplayData(snapshotToDisplayData(snapshot.value), previous)
		);
		const activeUI = computed<ConsentActiveUI>({
			get: () => toVueActiveUI(snapshot.value.activeUI),
			// Explicit navigation supersedes a pending save.
			set: (value) => showConsentSurface(kernel, toKernelActiveUI(value)),
		});
		const storedConsent = computed(() => snapshot.value.explicitChoice);

		let active = true;
		const isActive = () => active;

		return {
			activeUI,
			clearRecords: () => runtime.clearRecords(),
			dispose() {
				active = false;
				unsubscribeIab();
				unsubscribe();
				// A borrowed runtime belongs to its host.
				owned?.dispose();
			},
			experimentDefinition: owned ? owned.experiment : config.experiment,
			get iab() {
				return iab.value;
			},
			set iab(handle) {
				iab.value = handle;
			},
			init,
			kernel,
			ownsKernel: Boolean(owned),
			runtime,
			setOverrides(overrides) {
				runtime.setOverrides(overrides);
				// Before start, the first init carries them. On the server
				// nothing asks.
				if (typeof window !== 'undefined' && runtime.started) {
					void runtime.reinit();
				}
			},
			snapshot,
			start() {
				if (!owned || owned.started || !active) {
					return;
				}
				owned.start();
				if (
					owned.started &&
					isClientManifestModeEnabled(config) &&
					config.geoURL
				) {
					const stop = kernel.events.on('command:init:completed', () => {
						stop();
						if (active && owned) {
							void refreshClientGeo(owned, config, isActive);
						}
					});
				}
			},
			storedConsent,
			update(next) {
				void (async () => {
					try {
						await owned?.update({ ...toRuntimeOptions(next), createIAB });
					} catch {
						// The update chunk failed to load: the previous options stay.
					}
				})();
			},
		};
	};

/**
 * Provide a context to every component of an app under the package's
 * injection keys.
 *
 * @param app - The Vue app.
 * @param context - The app's context.
 */
export const provideVueConsentContext = function provideVueConsentContext(
	app: App,
	context: VueConsentKernelContext
): void {
	app.provide(symbolKernelContext, context);
	app.provide(symbolKernel, context.kernel);
	app.provide(symbolSnapshot, context.snapshot);
	app.provide(symbolInit, context.init);
	app.provide(symbolActiveUI, context.activeUI);
	app.provide(symbolConsent, context.storedConsent);
};
