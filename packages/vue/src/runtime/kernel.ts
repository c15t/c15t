import {
	c15tProtocolHeaders,
	createConsentKernel,
	createHostedTransport,
	initOutputToKernelConfig,
} from '@c15t/core';
import type {
	ConsentKernel,
	ConsentSnapshot,
	InitResponse,
	KernelActiveUI,
	HydrationRecords,
	KernelConfig,
	KernelTransport,
} from '@c15t/core';
import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
import type { IframeBlockerOptions } from '@c15t/core/modules/iframe-blocker';
import { createNetworkBlocker } from '@c15t/core/modules/network-blocker';
import type {
	BlockedRequestInfo,
	NetworkBlockerRule,
} from '@c15t/core/modules/network-blocker';
import { createPersistence } from '@c15t/core/modules/persistence';
import type { StorageConfig } from '@c15t/core/modules/persistence';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import { createWindowDebug } from '@c15t/core/modules/window-debug';
import type { ConsentActiveUI } from '@c15t/schema/config';
import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { computed, shallowRef } from 'vue';
import type { Ref } from 'vue';

import type { ConsentConfig } from './config';
import {
	isClientManifestModeEnabled,
	isServerManifestModeEnabled,
	resolveClientManifestURL,
} from './manifest';

export const INIT_HEADER_NAMES = [...CONSENT_REQUEST_HEADER_NAMES] as const;

const INIT_HEADER_ALLOWLIST = new Set<string>(INIT_HEADER_NAMES);

/** Translation, location and branding data for Vue components. Policy lives in the kernel snapshot. */
export type VueConsentDisplayData = Pick<
	InitOutput,
	'branding' | 'cmpId' | 'customVendors' | 'gvl' | 'location' | 'translations'
>;

export interface VueConsentKernelContext {
	/** Clears records through the mounted persistence instance when available. */
	clearRecords: () => void;
	kernel: ConsentKernel;
	snapshot: Ref<ConsentSnapshot>;
	init: Ref<VueConsentDisplayData | undefined>;
	activeUI: Ref<ConsentActiveUI>;
	storedConsent: Readonly<Ref<ConsentSnapshot['explicitChoice']>>;
	initialRecords?: HydrationRecords;
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
				import('@c15t/core/transports/manifest'),
				import('@c15t/translations/all'),
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
			const [{ createManifestTransport }, { baseTranslations }, manifest] =
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

const prepareVueRecords = (
	initialConfig: KernelConfig,
	rawRecords?: HydrationRecords,
	kernelRecords?: HydrationRecords
) => {
	const merged = { ...rawRecords, ...initialConfig.initialRecords };
	const initialRecords =
		kernelRecords ?? (Object.keys(merged).length ? merged : undefined);
	return {
		hydrationRecords:
			rawRecords ||
			kernelRecords ||
			(initialConfig.initialRecords &&
				(initialConfig.initialRecords.subject === null ||
					Object.keys(initialConfig.initialRecords).some(
						(key) => key !== 'subject'
					)))
				? initialRecords
				: undefined,
		initialRecords,
	};
};

const hydrateVuePersistence = (
	context: VueConsentKernelContext,
	persistence: ReturnType<typeof createPersistence>
): void => {
	if (context.initialRecords) {
		context.kernel.hydrate(context.initialRecords);
		return;
	}
	const prefetchedSubject = context.kernel.getSnapshot().subject;
	persistence.hydrate();
	if (prefetchedSubject) {
		context.kernel.hydrate({ subject: prefetchedSubject });
	}
};

export const createVueConsentKernelContext =
	function createVueConsentKernelContext(options: {
		config: RuntimeConsentConfig;
		headers?: Record<string, string | undefined>;
		prefetch?: InitOutput;
		initialRecords?: HydrationRecords;
		now?: number;
		kernelConfig?: KernelConfig;
		producerContract?: number | null;
	}): VueConsentKernelContext {
		const headers = pickAllowedInitHeaders(options.headers ?? {});
		const transport = isClientManifestModeEnabled(options.config)
			? createVueManifestTransport(
					options.config,
					headers,
					options.prefetch ?? options.config.prefetch
				)
			: createVueHostedTransport(
					options.config,
					headers,
					isServerManifestModeEnabled(options.config)
						? getNuxtInitFetchTarget(options.config)?.url
						: undefined
				);
		const initialConfig = initOutputToKernelConfig(
			options.prefetch ?? options.config.prefetch,
			headers,
			{ producerContract: options.producerContract }
		);
		const records = prepareVueRecords(
			initialConfig,
			options.initialRecords ?? options.config.initialRecords,
			options.kernelConfig?.initialRecords
		);
		const kernel = createConsentKernel({
			...initialConfig,
			initialRecords: records.initialRecords,
			now:
				options.now ??
				options.initialRecords?.now ??
				options.config.initialRecords?.now,
			transport,
			...options.kernelConfig,
		});

		const snapshot = shallowRef(kernel.getSnapshot());
		const unsubscribe = kernel.subscribe((next) => {
			snapshot.value = next;
		});

		const init = computed(() => snapshotToDisplayData(snapshot.value));
		const activeUI = computed<ConsentActiveUI>({
			get: () => toVueActiveUI(snapshot.value.activeUI),
			set: (value) => kernel.set.activeUI(toKernelActiveUI(value)),
		});
		const storedConsent = computed(() => snapshot.value.explicitChoice);
		const unsubscribeChoice = kernel.events.on(
			'choice:recorded',
			({ snapshot: eventSnapshot, confirmed, actionAt }) => {
				options.config.callbacks?.onChoiceRecorded?.({
					actionAt,
					confirmed,
					snapshot: eventSnapshot,
				});
			}
		);
		const unsubscribePermissions = kernel.events.on(
			'permissions:changed',
			({ snapshot: eventSnapshot, previous }) => {
				options.config.callbacks?.onPermissionsChanged?.({
					previous,
					snapshot: eventSnapshot,
				});
			}
		);

		return {
			activeUI,
			clearRecords: () => {
				kernel.hydrate({
					choice: null,
					noticeDismissal: null,
					optOutDirectives: [],
					subject: null,
				});
				kernel.events.emit({ type: 'records:cleared' });
			},
			dispose() {
				unsubscribe();
				unsubscribeChoice();
				unsubscribePermissions();
				kernel.dispose();
			},
			init,
			initialRecords: records.hydrationRecords,
			kernel,
			snapshot,
			storedConsent,
		};
	};

const normalizeGeoValue = function normalizeGeoValue(
	value: unknown
): string | undefined {
	return typeof value === 'string' && value.trim()
		? value.trim().toUpperCase()
		: undefined;
};

const refreshClientGeo = async function refreshClientGeo(
	context: VueConsentKernelContext,
	config: RuntimeConsentConfig,
	isActive: () => boolean
): Promise<void> {
	if (
		!isClientManifestModeEnabled(config) ||
		!config.geoURL ||
		typeof window === 'undefined'
	) {
		return;
	}

	const fetchImpl = config.customFetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		return;
	}

	try {
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
		context.kernel.set.overrides(overrides);
		await context.kernel.commands.init();
	} catch {
		// Keep the strict unknown-geo manifest result when the optional geo
		// microfetch is unavailable.
	}
};

export const startVueConsentRuntime = function startVueConsentRuntime(
	context: VueConsentKernelContext,
	config: RuntimeConsentConfig,
	options: { runInit?: boolean } = {}
): () => void {
	const disposers: (() => void)[] = [];

	if (typeof document !== 'undefined') {
		const windowDebug = createWindowDebug({
			mode:
				isClientManifestModeEnabled(config) ||
				isServerManifestModeEnabled(config)
					? 'manifest'
					: 'hosted',
			pkg: '@c15t/vue',
		});
		disposers.push(() => windowDebug.dispose());
	}

	if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
		const persistence = createPersistence({
			kernel: context.kernel,
			skipHydration: true,
			storageConfig: config.storageConfig,
		});
		hydrateVuePersistence(context, persistence);
		const clearMemory = context.clearRecords;
		context.clearRecords = persistence.clear;
		disposers.push(() => {
			context.clearRecords = clearMemory;
			persistence.dispose();
		});
	}

	const detectedGpc = context.snapshot.value.privacySignals.gpc;
	if (detectedGpc.detected && detectedGpc.active) {
		// Prepared hydration is read-only. Commit the honored request signal
		// through the public setter once the provider has mounted.
		context.kernel.set.privacySignals({ gpc: true });
	}

	if (typeof document !== 'undefined' && config.scripts?.length) {
		const scriptLoader = createScriptLoader({
			kernel: context.kernel,
			scripts: config.scripts,
		});
		disposers.push(() => scriptLoader.dispose());
	}

	if (typeof document !== 'undefined' && config.networkBlocker) {
		const networkBlocker = createNetworkBlocker({
			enabled: config.networkBlocker.enabled,
			kernel: context.kernel,
			logBlockedRequests: config.networkBlocker.logBlockedRequests,
			onRequestBlocked: config.networkBlocker.onRequestBlocked,
			rules: config.networkBlocker.rules,
		});
		disposers.push(() => networkBlocker.dispose());
	}

	if (typeof document !== 'undefined' && config.iframeBlocker !== false) {
		const iframeBlocker = createIframeBlocker({
			kernel: context.kernel,
			...(config.iframeBlocker ?? {}),
		});
		disposers.push(() => iframeBlocker.dispose());
	}

	const browserGpc = getBrowserGpc();
	if (browserGpc !== undefined) {
		context.kernel.set.privacySignals({ gpc: browserGpc });
	}
	let active = true;
	const isActive = () => active;

	if (options.runInit !== false) {
		void (async () => {
			await context.kernel.commands.init();
			if (!active) {
				return;
			}
			await refreshClientGeo(context, config, isActive);
		})();
	}

	return () => {
		active = false;
		for (const dispose of disposers) {
			dispose();
		}
		context.dispose();
	};
};
