import {
	c15tVersionHeaders,
	createConsentKernel,
	createHostedTransport,
	initOutputToKernelConfig,
	isValidSubjectId,
} from '@c15t/core/v3';
import type {
	ConsentKernel,
	ConsentSnapshot,
	InitResponse,
	KernelActiveUI,
	KernelConfig,
	KernelTransport,
} from '@c15t/core/v3';
import type { Consent } from '@c15t/core/v3/consent-record';
import { createIframeBlocker } from '@c15t/core/v3/modules/iframe-blocker';
import type { IframeBlockerOptions } from '@c15t/core/v3/modules/iframe-blocker';
import { createNetworkBlocker } from '@c15t/core/v3/modules/network-blocker';
import type {
	BlockedRequestInfo,
	NetworkBlockerRule,
} from '@c15t/core/v3/modules/network-blocker';
import { createPersistence } from '@c15t/core/v3/modules/persistence';
import type {
	StorageConfig,
	StoredPayload,
} from '@c15t/core/v3/modules/persistence';
import { createScriptLoader } from '@c15t/core/v3/modules/script-loader';
import type { Script } from '@c15t/core/v3/modules/script-loader';
import { createWindowDebug } from '@c15t/core/v3/modules/window-debug';
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

export interface VueConsentKernelContext {
	kernel: ConsentKernel;
	snapshot: Ref<ConsentSnapshot>;
	init: Ref<InitOutput | undefined>;
	activeUI: Ref<ConsentActiveUI>;
	storedConsent: Ref<Consent>;
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

const snapshotToInitOutput = function snapshotToInitOutput(
	snapshot: ConsentSnapshot
): InitOutput | undefined {
	if (!snapshot.location || !snapshot.translations) {
		return undefined;
	}
	return {
		branding: snapshot.branding ?? 'c15t',
		cmpId: snapshot.iab?.cmpId ?? undefined,
		customVendors: snapshot.iab?.customVendors,
		gvl: snapshot.iab?.gvl ?? undefined,
		jurisdiction: snapshot.policyDecision?.jurisdiction ?? 'NONE',
		location: snapshot.location,
		policy: snapshot.policy ?? undefined,
		policyDecision: snapshot.policyDecision ?? undefined,
		policySnapshotToken: snapshot.policySnapshotToken ?? undefined,
		translations: snapshot.translations,
	} as InitOutput;
};

const snapshotToStoredConsent = function snapshotToStoredConsent(
	snapshot: ConsentSnapshot
): Consent {
	const categories: Consent['categories'] = {};
	if (snapshot.hasConsented) {
		for (const [category, enabled] of Object.entries(snapshot.consents)) {
			categories[category as keyof Consent['categories']] = enabled;
		}
	}
	const policies: Consent['policies'] = {};
	if (
		snapshot.hasConsented &&
		snapshot.policy?.id &&
		snapshot.policyDecision?.fingerprint
	) {
		policies[snapshot.policy.id] = {
			fingerprint: snapshot.policyDecision.fingerprint,
			timestamp: Date.now().toString(),
		};
	}
	return { categories, policies };
};

const storedPayloadToKernelConfig = function storedPayloadToKernelConfig(
	stored: StoredPayload | null | undefined
): KernelConfig {
	if (!stored || typeof stored !== 'object') {
		return {};
	}

	const config: KernelConfig = {};
	if (stored.consents) {
		config.initialConsents = stored.consents;
		config.initialHasConsented = true;
	}
	if (stored.consentInfo) {
		config.initialHasConsented = true;
		const storedId = stored.consentInfo.subjectId;
		if (storedId && isValidSubjectId(storedId)) {
			config.initialSubjectId = storedId;
		}
	}

	return config;
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
	const value = (navigator as Navigator & { globalPrivacyControl?: boolean })
		.globalPrivacyControl;
	return typeof value === 'boolean' ? value : undefined;
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

const createVueHostedTransport = function createVueHostedTransport(
	config: RuntimeConsentConfig,
	headers: Record<string, string>,
	initURL?: string
): KernelTransport {
	const backendURL = config.backendURL ?? '/api/c15t';
	const baseTransport = createHostedTransport({
		backendURL,
		domain: config.domain,
		fetch: config.customFetch,
		headers,
		initURL,
	});

	return {
		identify: baseTransport.identify,
		init(ctx) {
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
			return (
				createHostedTransport({
					backendURL,
					domain: config.domain,
					fetch: config.customFetch,
					headers: contextualHeaders,
					initURL,
				}).init?.(ctx) ?? Promise.resolve<InitResponse>({})
			);
		},
		save: baseTransport.save,
	};
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
	const clientResourcesPromise =
		typeof window === 'undefined'
			? undefined
			: Promise.all([
					import('@c15t/core/v3/transports/manifest'),
					import('@c15t/translations/all'),
					(async (): Promise<ConsentManifest> => {
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
								...c15tVersionHeaders,
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
					})(),
				]);

	return {
		async init(ctx) {
			if (!clientResourcesPromise) {
				return {};
			}

			const [{ createManifestTransport }, { baseTranslations }, manifest] =
				await clientResourcesPromise;
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

export const createVueConsentKernelContext =
	function createVueConsentKernelContext(options: {
		config: RuntimeConsentConfig;
		headers?: Record<string, string | undefined>;
		prefetch?: InitOutput;
		initialStoredConsent?: StoredPayload | null;
	}): VueConsentKernelContext {
		const headers = pickAllowedInitHeaders(options.headers ?? {});
		const transport = isClientManifestModeEnabled(options.config)
			? createVueManifestTransport(options.config, headers, options.prefetch)
			: createVueHostedTransport(
					options.config,
					headers,
					isServerManifestModeEnabled(options.config)
						? getNuxtInitFetchTarget(options.config)?.url
						: undefined
				);
		const kernel = createConsentKernel({
			...initOutputToKernelConfig(options.prefetch, headers),
			...storedPayloadToKernelConfig(options.initialStoredConsent),
			transport,
		});

		const snapshot = shallowRef(kernel.getSnapshot());
		const unsubscribe = kernel.subscribe((next) => {
			snapshot.value = next;
		});

		const init = computed(() => snapshotToInitOutput(snapshot.value));
		const activeUI = computed<ConsentActiveUI>({
			get: () => toVueActiveUI(snapshot.value.activeUI),
			set: (value) => kernel.set.activeUI(toKernelActiveUI(value)),
		});
		const storedConsent = computed<Consent>({
			get: () => snapshotToStoredConsent(snapshot.value),
			set: (value) => {
				kernel.set.consent(value.categories);
			},
		});

		return {
			activeUI,
			dispose() {
				unsubscribe();
			},
			init,
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
	config: RuntimeConsentConfig
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
		if (!(country || region)) {
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
		persistence.hydrate();
		disposers.push(() => persistence.dispose());
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

	if (options.runInit !== false) {
		void (async () => {
			await context.kernel.commands.init();
			await refreshClientGeo(context, config);
		})();
	}

	return () => {
		for (const dispose of disposers) {
			dispose();
		}
		context.dispose();
	};
};
