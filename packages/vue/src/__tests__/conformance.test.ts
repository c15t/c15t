import {
	DriverNotImplementedError,
	IAB_FIXTURE_CMP_ID,
	MINIMAL_GVL,
	runConformanceSuite,
} from '@c15t/conformance';
import type {
	MountableComponent,
	MountOptions,
	MountResult,
	SuiteApi,
	TestDriver,
} from '@c15t/conformance';
/**
 * Vue conformance entry point.
 *
 * The Vue package exposes a Nuxt plugin rather than a standalone provider
 * component, so the driver builds the same kernel context the plugin provides
 * and injects it into a small Vue app around the requested component.
 */
import { initOutputToKernelConfig } from '@c15t/core';
import type { InitResponse, KernelConfig, KernelTransport } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type {
	GlobalVendorList,
	InitOutput,
	TranslationsResponse,
} from '@c15t/schema/types';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { createApp, createSSRApp, defineComponent, h } from 'vue';
import type { App } from 'vue';
import { renderToString } from 'vue/server-renderer';

import ConsentBanner from '../runtime/components/consent-banner.vue';
import ConsentManager from '../runtime/components/consent-manager.vue';
import ConsentWidget from '../runtime/components/consent-widget.vue';
import IabConsentBanner from '../runtime/components/iab-consent-banner.vue';
import IabConsentDialog from '../runtime/components/iab-consent-dialog.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { createVueConsentKernelContext } from '../runtime/kernel';
import type { VueConsentKernelContext } from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';
import { createPolicySession, probePolicyContract } from './policy-driver';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

type ProviderOptions = Partial<ConsentConfig> & {
	callbacks?: Record<string, (...args: unknown[]) => void>;
	i18n?: {
		locale?: string;
		messages?: Record<string, Partial<TranslationsResponse>>;
	};
	initialTranslationConfig?: {
		defaultLanguage?: string;
		translations?: Record<string, Partial<TranslationsResponse>> | null;
	};
};

type StoreState = Record<string, unknown> & {
	consents: Record<string, boolean>;
	selectedConsents: Record<string, boolean>;
	activeUI: 'none' | 'banner' | 'dialog';
	consentCategories: string[];
};

const DEFAULT_CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const;

const DEFAULT_TRANSLATIONS: TranslationsResponse = {
	common: {
		acceptAll: 'Accept all',
		customize: 'Customize',
		rejectAll: 'Reject all',
		save: 'Save',
	},
	consentManagerDialog: {
		description: 'Manage your choices.',
		title: 'Privacy preferences',
	},
	consentTypes: {
		experience: {
			description: 'Experience cookies.',
			title: 'Experience',
		},
		functionality: {
			description: 'Feature cookies.',
			title: 'Functionality',
		},
		marketing: {
			description: 'Targeted advertising.',
			title: 'Marketing',
		},
		measurement: {
			description: 'Analytics and performance measurement.',
			title: 'Measurement',
		},
		necessary: {
			description: 'Required for the site to function.',
			title: 'Necessary',
		},
	},
	cookieBanner: {
		description: 'We use cookies to enhance your experience.',
		title: 'We value your privacy',
	},
	frame: {
		actionButton: 'Manage',
		title: 'Privacy',
	},
	legalLinks: {
		cookiePolicy: 'Cookie policy',
		privacyPolicy: 'Privacy policy',
		termsOfService: 'Terms of service',
	},
};

const mergeTranslations = function mergeTranslations(
	base: TranslationsResponse,
	override: Partial<TranslationsResponse> | undefined
): TranslationsResponse {
	if (!override || typeof override !== 'object') {
		return base;
	}
	return {
		...base,
		...override,
		common: { ...base.common, ...override.common },
		consentManagerDialog: {
			...base.consentManagerDialog,
			...override.consentManagerDialog,
		},
		consentTypes: {
			...base.consentTypes,
			...override.consentTypes,
		},
		cookieBanner: { ...base.cookieBanner, ...override.cookieBanner },
		frame: { ...base.frame, ...override.frame },
		legalLinks: { ...base.legalLinks, ...override.legalLinks },
	};
};

const resolveTranslations = function resolveTranslations(
	options: ProviderOptions,
	locale?: string
) {
	const language =
		locale ??
		options.i18n?.locale ??
		options.initialTranslationConfig?.defaultLanguage ??
		'en';
	const messages = options.i18n?.messages;
	const legacyMessages = options.initialTranslationConfig?.translations;
	const override =
		messages?.[language] ??
		messages?.en ??
		(legacyMessages && typeof legacyMessages === 'object'
			? (legacyMessages[language] ?? legacyMessages.en)
			: undefined);

	return {
		language,
		translations: mergeTranslations(DEFAULT_TRANSLATIONS, override),
	};
};

const isIabComponent = function isIabComponent(
	component: MountableComponent
): boolean {
	return (
		component === 'iab-consent-banner' || component === 'iab-consent-dialog'
	);
};

const policyModelFor = function policyModelFor(
	opts: MountOptions
): 'opt-in' | 'opt-out' | 'iab' {
	if (isIabComponent(opts.component)) {
		return 'iab';
	}
	return opts.policy?.model ?? 'opt-in';
};

const buildInitOutput = function buildInitOutput(
	opts: MountOptions,
	options: ProviderOptions
): InitOutput {
	const consentCategories =
		options.consentCategories?.length === 0
			? [...DEFAULT_CONSENT_CATEGORIES]
			: [...(options.consentCategories ?? DEFAULT_CONSENT_CATEGORIES)];
	const policy = normalizePolicyRule({
		categories: consentCategories.filter(
			(category) => category !== 'necessary'
		),
		id: 'vue_conformance_policy',
		match: { fallback: true },
		model: policyModelFor(opts),
		prompt: 'choice',
		scopeMode: 'permissive',
	});
	const policyResolution = writePolicyResolutionWire({
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'fallback',
		policy,
		policyId: policy.id,
		status: 'matched',
	});
	return {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: {
			countryCode: 'DE',
			regionCode: null,
		},
		policyResolution,
		policySnapshotToken: 'vue_conformance_token',
		translations: resolveTranslations(options, opts.locale),
	};
};

const buildKernelConfig = function buildKernelConfig(
	opts: MountOptions,
	options: ProviderOptions,
	transport: KernelTransport
): KernelConfig {
	const state = opts.initialState as
		| {
				consents?: Record<string, boolean>;
				hasConsented?: boolean;
		  }
		| undefined;
	const initMode = opts.initMode ?? 'authoritative';
	const base: KernelConfig = {
		initialDraft: state?.consents,
		initialTranslations: resolveTranslations(options, opts.locale),
		transport,
	};
	if (opts.gpc !== undefined) {
		base.initialOverrides = { gpc: opts.gpc };
	}
	if (isIabComponent(opts.component)) {
		base.initialIab = {
			cmpId: IAB_FIXTURE_CMP_ID,
			enabled: true,
			gvl: MINIMAL_GVL as unknown as GlobalVendorList,
		};
	}
	if (initMode === 'authoritative') {
		return {
			...base,
			initialBranding: 'c15t',
			initialLocation: {
				countryCode: 'DE',
				regionCode: null,
			},
			...initOutputToKernelConfig(buildInitOutput(opts, options)),
			initialIab: base.initialIab,
			initialPolicySnapshotToken: 'vue_conformance_token',
		};
	}
	return {
		...base,
		initialPolicyPending: true,
	};
};

const mockFetch = function mockFetch(init: InitOutput): typeof fetch {
	return vi.fn((input: RequestInfo | URL, request?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/init')) {
			return Promise.resolve(
				new Response(JSON.stringify(init), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
		}
		if (url.endsWith('/subjects')) {
			const body = JSON.parse(String(request?.body ?? '{}')) as {
				subjectId?: string;
			};
			return Promise.resolve(
				new Response(JSON.stringify({ ok: true, subjectId: body.subjectId }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			);
		}
		return Promise.resolve(new Response('not found', { status: 404 }));
	}) as unknown as typeof fetch;
};

const buildConfig = function buildConfig(
	opts: MountOptions,
	init: InitOutput
): ConsentConfig {
	const provided = (opts.providerOptions ?? {}) as ProviderOptions;
	return {
		...provided,
		backendURL: 'https://consent.example',
		consentCategories: provided.consentCategories ?? [
			...DEFAULT_CONSENT_CATEGORIES,
		],
		customFetch: mockFetch(init),
		disableAnimation: true,
		domain: 'consent.example',
		hideBranding: true,
		trapFocus: provided.trapFocus ?? false,
	} as ConsentConfig;
};

const provideContext = function provideContext(
	app: App,
	context: VueConsentKernelContext,
	config: ConsentConfig
) {
	app.provide(consentConfigKey, config);
	app.provide(symbolKernelContext, context);
	app.provide(symbolKernel, context.kernel);
	app.provide(symbolSnapshot, context.snapshot);
	app.provide(symbolInit, context.init);
	app.provide(symbolActiveUI, context.activeUI);
	app.provide(symbolConsent, context.storedConsent);
};

const componentFor = function componentFor(component: MountableComponent) {
	switch (component) {
		case 'consent-banner':
			return defineComponent({
				name: 'VueConformanceBannerAndDialog',
				setup() {
					return () => [h(ConsentBanner), h(ConsentManager)];
				},
			});
		case 'consent-dialog':
			return ConsentManager;
		case 'consent-widget':
			return ConsentWidget;
		case 'iab-consent-banner':
			return IabConsentBanner;
		case 'iab-consent-dialog':
			return IabConsentDialog;
		default:
			throw new DriverNotImplementedError('vue', `mount(${component})`);
	}
};

const createHarness = function createHarness(
	opts: MountOptions,
	_options: ProviderOptions,
	context: VueConsentKernelContext
) {
	const Child = componentFor(opts.component);
	// Persistence mounts follow the real lifecycle: the kernel derives
	// `activeUI` from the policy and storage hydration may dismiss it.
	if (
		(opts.initMode ?? 'authoritative') === 'authoritative' &&
		!opts.persistence
	) {
		if (
			opts.component === 'consent-dialog' ||
			opts.component === 'consent-widget' ||
			opts.component === 'iab-consent-dialog'
		) {
			context.kernel.set.activeUI('dialog');
		} else {
			context.kernel.set.activeUI('banner');
		}
	}

	return defineComponent({
		name: 'VueConformanceHarness',
		setup() {
			return () =>
				h(
					'div',
					{
						'data-testid': 'vue-conformance-root',
						dir: opts.locale === 'ar' ? 'rtl' : undefined,
					},
					[h(Child)]
				);
		},
	});
};

const createContext = function createContext(opts: MountOptions) {
	const options = (opts.providerOptions ?? {}) as ProviderOptions;
	if ((opts.initMode ?? 'authoritative') !== 'authoritative') {
		throw new DriverNotImplementedError(
			'vue',
			`createContext(${opts.initMode}) requires a controlled lifecycle context`
		);
	}
	const init = buildInitOutput(opts, options);
	const config = buildConfig(opts, init);
	const context = createVueConsentKernelContext({
		config,
		prefetch: init,
	});

	return {
		config,
		context,
		options,
	};
};

const createPendingInit = function createPendingInit(response: InitResponse) {
	let resolve!: () => void;
	const promise = createDeferredPromise<InitResponse>((settle) => {
		resolve = () => settle(response);
	});
	return { promise, resolve };
};

const createLifecycleTransport = function createLifecycleTransport(
	opts: MountOptions
) {
	if ((opts.initMode ?? 'authoritative') === 'pending') {
		const deferred = createPendingInit({
			policyResolution: buildInitOutput(
				opts,
				(opts.providerOptions ?? {}) as ProviderOptions
			).policyResolution,
		});
		return {
			resolve: deferred.resolve,
			transport: {
				init: () => deferred.promise,
			},
		};
	}
	if (opts.initMode === 'failing') {
		return {
			resolve: undefined,
			transport: {
				init() {
					return Promise.reject(new Error('conformance: init failed'));
				},
			},
		};
	}
	const init = buildInitOutput(
		opts,
		(opts.providerOptions ?? {}) as ProviderOptions
	);
	return {
		resolve: undefined,
		transport: {
			init() {
				return Promise.resolve({
					branding: init.branding === 'none' ? undefined : init.branding,
					location: init.location,
					policyResolution: init.policyResolution,
					policySnapshotToken: init.policySnapshotToken,
					translations: init.translations,
				});
			},
		},
	};
};

const createControlledContext = function createControlledContext(
	opts: MountOptions
) {
	const options = (opts.providerOptions ?? {}) as ProviderOptions;
	const lifecycle = createLifecycleTransport(opts);
	const config = buildConfig(opts, buildInitOutput(opts, options));
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: buildKernelConfig(opts, options, lifecycle.transport),
	});
	return {
		config,
		context,
		options,
		resolveInit: lifecycle.resolve,
	};
};

const activeUIForStore = function activeUIForStore(
	activeUI: string | null
): StoreState['activeUI'] {
	if (activeUI === 'banner' || activeUI === 'dialog') {
		return activeUI;
	}
	return 'none';
};

const projectStoreState = function projectStoreState(
	context: VueConsentKernelContext
): StoreState {
	const snapshot = context.kernel.getSnapshot();
	const consents = { ...snapshot.effectivePermissions } as Record<
		string,
		boolean
	>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyRule.scope],
		consents,
		selectedConsents: { ...consents },
	};
};

const flushScheduler = async function flushScheduler() {
	await flushPromises();
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
};

let lastContext: VueConsentKernelContext | null = null;

const driver: TestDriver = {
	createPolicySession,
	framework: 'vue',
	getStore() {
		if (!lastContext) {
			throw new Error('Vue driver: getStore called before mount');
		}
		return {
			getState: () => projectStoreState(lastContext as VueConsentKernelContext),
			subscribe: (listener: () => void) =>
				(lastContext as VueConsentKernelContext).kernel.subscribe(() => {
					listener();
				}),
		};
	},
	async mount(opts: MountOptions): Promise<MountResult> {
		const { context, config, options, resolveInit } =
			createControlledContext(opts);
		lastContext = context;

		// Public persistence path: same module `startVueConsentRuntime` wires —
		// hydrate stored consent before the app mounts, write on every save.
		const persistence = opts.persistence
			? createPersistence({ kernel: context.kernel, skipHydration: true })
			: null;
		persistence?.hydrate();

		const container = document.createElement('div');
		document.body.appendChild(container);

		const app = createApp(createHarness(opts, options, context));
		provideContext(app, context, config);
		app.mount(container);
		await flushScheduler();
		if ((opts.initMode ?? 'authoritative') !== 'authoritative') {
			void context.kernel.commands.init();
			await flushScheduler();
		}

		return {
			resolveInit: resolveInit
				? async () => {
						resolveInit();
						await flushScheduler();
					}
				: undefined,
			root: container,
			unmount: async () => {
				app.unmount();
				await flushScheduler();
				container.replaceChildren();
				container.remove();
				document.body
					.querySelectorAll(
						'[data-testid^="consent-"], [data-testid^="iab-consent-"]'
					)
					.forEach((element) => {
						element.remove();
					});
				persistence?.dispose();
				context.dispose();
				if (lastContext === context) {
					lastContext = null;
				}
			},
		};
	},
	probePolicyContract,
	async serverRender(opts: MountOptions): Promise<string> {
		const { context, config, options } =
			(opts.initMode ?? 'authoritative') === 'authoritative'
				? createContext(opts)
				: createControlledContext(opts);
		try {
			const app = createSSRApp(createHarness(opts, options, context));
			provideContext(app, context, config);
			return await renderToString(app);
		} finally {
			context.dispose();
		}
	},
};

const api: SuiteApi = {
	describe,
	expect: expect as unknown as SuiteApi['expect'],
	test,
};

runConformanceSuite(driver, api);
