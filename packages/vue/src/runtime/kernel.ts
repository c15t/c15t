import type { ConsentActiveUI } from '@c15t/schema/config';
import type { InitOutput } from '@c15t/schema/types';
import {
	type ConsentKernel,
	type ConsentSnapshot,
	createConsentKernel,
	createHostedTransport,
	type KernelActiveUI,
	type KernelConfig,
	type KernelTransport,
} from 'c15t/v3';
import type { Consent } from 'c15t/v3/consent-record';
import {
	createPersistence,
	type StorageConfig,
} from 'c15t/v3/modules/persistence';
import { createScriptLoader, type Script } from 'c15t/v3/modules/script-loader';
import { computed, type Ref, shallowRef } from 'vue';
import type { ConsentConfig } from './config';

export const INIT_HEADER_NAMES = [
	'accept-language',
	'sec-gpc',
	'x-c15t-country',
	'x-c15t-region',
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-vercel-ip-country-region',
] as const;

const INIT_HEADER_ALLOWLIST = new Set<string>(INIT_HEADER_NAMES);

export interface VueConsentKernelContext {
	kernel: ConsentKernel;
	snapshot: Ref<ConsentSnapshot>;
	init: Ref<InitOutput | undefined>;
	activeUI: Ref<ConsentActiveUI>;
	storedConsent: Ref<Consent>;
	dispose(): void;
}

type RuntimeConsentConfig = ConsentConfig & {
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

function initOutputToKernelConfig(init: InitOutput | undefined): KernelConfig {
	if (!init) return {};
	const config: KernelConfig = {
		initialLocation: init.location,
		initialTranslations: init.translations,
		initialPolicy: init.policy,
		initialPolicyDecision: init.policyDecision,
		initialPolicySnapshotToken: init.policySnapshotToken,
	};
	if (init.branding !== 'none') {
		config.initialBranding = init.branding;
	}
	if (
		init.gvl !== undefined ||
		init.customVendors !== undefined ||
		init.cmpId !== undefined
	) {
		config.initialIab = {
			enabled: Boolean(init.gvl),
			gvl: init.gvl ?? null,
			customVendors: init.customVendors ?? [],
			cmpId: init.cmpId ?? null,
		};
	}
	return config;
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

export function createVueConsentKernelContext(options: {
	config: RuntimeConsentConfig;
	headers?: Record<string, string | undefined>;
	prefetch?: InitOutput;
}): VueConsentKernelContext {
	const headers = pickAllowedInitHeaders(options.headers ?? {});
	const transport = createVueHostedTransport(options.config, headers);
	const kernel = createConsentKernel({
		...initOutputToKernelConfig(options.prefetch),
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
		void context.kernel.commands.init();
	}

	return () => {
		for (const dispose of disposers) {
			dispose();
		}
		context.dispose();
	};
}
