import type { ConsentActiveUI } from '@c15t/schema/config';
import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
	type InitOutput,
} from '@c15t/schema/types';
import {
	type ConsentKernel,
	type ConsentSnapshot,
	createConsentKernel,
	createHostedTransport,
	createManifestTransport,
	initOutputToKernelConfig,
	isValidSubjectId,
	type KernelActiveUI,
	type KernelConfig,
	type KernelTransport,
} from 'c15t/v3';
import type { Consent } from 'c15t/v3/consent-record';
import {
	createPersistence,
	type StorageConfig,
	type StoredPayload,
} from 'c15t/v3/modules/persistence';
import { createScriptLoader, type Script } from 'c15t/v3/modules/script-loader';
import { computed, type Ref, shallowRef } from 'vue';
import type { ConsentConfig } from './config';
import {
	isClientManifestModeEnabled,
	isServerManifestModeEnabled,
	resolveClientManifestURL,
	resolveNuxtManifestRoute,
} from './manifest';

export const INIT_HEADER_NAMES = [...CONSENT_REQUEST_HEADER_NAMES] as const;

const INIT_HEADER_ALLOWLIST = new Set<string>(INIT_HEADER_NAMES);

export interface VueConsentKernelContext {
	kernel: ConsentKernel;
	snapshot: Ref<ConsentSnapshot>;
	init: Ref<InitOutput | undefined>;
	activeUI: Ref<ConsentActiveUI>;
	storedConsent: Ref<Consent>;
	dispose(): void;
}

export type RuntimeConsentConfig = ConsentConfig & {
	scripts?: Script[];
	storageConfig?: StorageConfig;
	customFetch?: typeof fetch;
	domain?: string;
};

export function pickAllowedInitHeaders(
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
}

function toKernelActiveUI(ui: ConsentActiveUI): KernelActiveUI {
	if (ui === 'manager') return 'dialog';
	if (ui === null) return 'none';
	return ui;
}

function toVueActiveUI(ui: KernelActiveUI): ConsentActiveUI {
	if (ui === 'dialog') return 'manager';
	if (ui === 'none') return null;
	return ui;
}

function snapshotToInitOutput(
	snapshot: ConsentSnapshot
): InitOutput | undefined {
	if (!snapshot.location || !snapshot.translations) {
		return undefined;
	}
	return {
		jurisdiction: snapshot.policyDecision?.jurisdiction ?? 'NONE',
		location: snapshot.location,
		translations: snapshot.translations,
		branding: snapshot.branding ?? 'c15t',
		gvl: snapshot.iab?.gvl ?? undefined,
		customVendors: snapshot.iab?.customVendors,
		cmpId: snapshot.iab?.cmpId ?? undefined,
		policy: snapshot.policy ?? undefined,
		policyDecision: snapshot.policyDecision ?? undefined,
		policySnapshotToken: snapshot.policySnapshotToken ?? undefined,
	} as InitOutput;
}

function snapshotToStoredConsent(snapshot: ConsentSnapshot): Consent {
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
	return { policies, categories };
}

function storedPayloadToKernelConfig(
	stored: StoredPayload | null | undefined
): KernelConfig {
	if (!stored || typeof stored !== 'object') return {};

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
}

export function getNuxtInitFetchTarget(config: Partial<RuntimeConsentConfig>):
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
		url: '/init',
		baseURL: config.backendURL,
	};
}

function getBrowserLanguage(): string | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	return navigator.language || navigator.languages?.[0];
}

function getBrowserGpc(): boolean | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	const value = (navigator as Navigator & { globalPrivacyControl?: boolean })
		.globalPrivacyControl;
	return typeof value === 'boolean' ? value : undefined;
}

function getManifestInputs(
	config: RuntimeConsentConfig,
	headers: Record<string, string>
) {
	if (isClientManifestModeEnabled(config)) {
		const inputs = extractConsentRequestInputs({
			...headers,
			...(getBrowserLanguage()
				? { 'accept-language': getBrowserLanguage() }
				: {}),
		});
		return {
			country: null,
			region: null,
			language: inputs.language ?? 'en',
			gpc: getBrowserGpc() ?? inputs.gpc,
		};
	}

	const inputs = extractConsentRequestInputs(headers);
	return {
		country: inputs.country ?? null,
		region: inputs.region ?? null,
		language: inputs.language ?? 'en',
		gpc: inputs.gpc,
	};
}

function createVueHostedTransport(
	config: RuntimeConsentConfig,
	headers: Record<string, string>
): KernelTransport {
	const backendURL = config.backendURL ?? '/api/c15t';
	const baseTransport = createHostedTransport({
		backendURL,
		domain: config.domain,
		fetch: config.customFetch,
		headers,
	});

	return {
		async init(ctx) {
			const contextualHeaders = pickAllowedInitHeaders({
				...headers,
				...(ctx.overrides.language
					? { 'accept-language': ctx.overrides.language }
					: {}),
				...(ctx.overrides.gpc === undefined
					? {}
					: { 'sec-gpc': ctx.overrides.gpc ? '1' : '0' }),
				...(ctx.overrides.country
					? { 'x-c15t-country': ctx.overrides.country }
					: {}),
				...(ctx.overrides.region
					? { 'x-c15t-region': ctx.overrides.region }
					: {}),
			});
			return (
				createHostedTransport({
					backendURL,
					domain: config.domain,
					fetch: config.customFetch,
					headers: contextualHeaders,
				}).init?.(ctx) ?? {}
			);
		},
		save: baseTransport.save,
		identify: baseTransport.identify,
	};
}

function createVueManifestTransport(
	config: RuntimeConsentConfig,
	headers: Record<string, string>,
	prefetch: InitOutput | undefined
): KernelTransport {
	const backendURL = config.backendURL ?? '/api/c15t';
	return createManifestTransport({
		backendURL,
		manifestURL: isClientManifestModeEnabled(config)
			? resolveClientManifestURL(config)
			: resolveNuxtManifestRoute(config),
		domain: config.domain,
		fetch: config.customFetch,
		headers,
		inputs: getManifestInputs(config, headers),
		initialInit: prefetch,
	});
}

export function createVueConsentKernelContext(options: {
	config: RuntimeConsentConfig;
	headers?: Record<string, string | undefined>;
	prefetch?: InitOutput;
	initialStoredConsent?: StoredPayload | null;
}): VueConsentKernelContext {
	const headers = pickAllowedInitHeaders(options.headers ?? {});
	const transport =
		isClientManifestModeEnabled(options.config) ||
		isServerManifestModeEnabled(options.config)
			? createVueManifestTransport(options.config, headers, options.prefetch)
			: createVueHostedTransport(options.config, headers);
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
		kernel,
		snapshot,
		init,
		activeUI,
		storedConsent,
		dispose() {
			unsubscribe();
		},
	};
}

function normalizeGeoValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim()
		? value.trim().toUpperCase()
		: undefined;
}

async function refreshClientGeo(
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
			method: 'GET',
			credentials: 'same-origin',
			headers: { accept: 'application/json' },
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
		context.kernel.set.overrides({
			...(country ? { country } : {}),
			...(region ? { region } : {}),
		});
		await context.kernel.commands.init();
	} catch {
		// Keep the strict unknown-geo manifest result when the optional geo
		// microfetch is unavailable.
	}
}

export function startVueConsentRuntime(
	context: VueConsentKernelContext,
	config: RuntimeConsentConfig,
	options: { runInit?: boolean } = {}
): () => void {
	const disposers: Array<() => void> = [];

	if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
		const persistence = createPersistence({
			kernel: context.kernel,
			storageConfig: config.storageConfig,
			skipHydration: true,
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
}
