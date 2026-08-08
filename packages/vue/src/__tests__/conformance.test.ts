/**
 * Vue conformance entry point.
 *
 * The Vue package exposes a Nuxt plugin rather than a standalone provider
 * component, so the driver builds the same kernel context the plugin provides
 * and injects it into a small Vue app around the requested component.
 */

import {
	DriverNotImplementedError,
	IAB_FIXTURE_CMP_ID,
	MINIMAL_GVL,
	type MountableComponent,
	type MountOptions,
	type MountResult,
	runConformanceSuite,
	type SuiteApi,
	type TestDriver,
} from '@c15t/conformance';
import {
	type ConsentKernel,
	type ConsentSnapshot,
	createConsentKernel,
	type KernelConfig,
	type KernelTransport,
} from '@c15t/core/v3';
import { createPersistence } from '@c15t/core/v3/modules/persistence';
import type {
	GlobalVendorList,
	InitOutput,
	TranslationsResponse,
} from '@c15t/schema/types';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import {
	type App,
	computed,
	createApp,
	createSSRApp,
	defineComponent,
	h,
	shallowRef,
} from 'vue';
import { renderToString } from 'vue/server-renderer';
import ConsentBanner from '../runtime/components/consent-banner.vue';
import ConsentManager from '../runtime/components/consent-manager.vue';
import ConsentWidget from '../runtime/components/consent-widget.vue';
import IabConsentBanner from '../runtime/components/iab-consent-banner.vue';
import IabConsentDialog from '../runtime/components/iab-consent-dialog.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import {
	createVueConsentKernelContext,
	type VueConsentKernelContext,
} from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

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
		rejectAll: 'Reject all',
		customize: 'Customize',
		save: 'Save',
	},
	cookieBanner: {
		title: 'We value your privacy',
		description: 'We use cookies to enhance your experience.',
	},
	consentManagerDialog: {
		title: 'Privacy preferences',
		description: 'Manage your choices.',
	},
	consentTypes: {
		necessary: {
			title: 'Necessary',
			description: 'Required for the site to function.',
		},
		functionality: {
			title: 'Functionality',
			description: 'Feature cookies.',
		},
		experience: {
			title: 'Experience',
			description: 'Experience cookies.',
		},
		measurement: {
			title: 'Measurement',
			description: 'Analytics and performance measurement.',
		},
		marketing: {
			title: 'Marketing',
			description: 'Targeted advertising.',
		},
	},
	frame: {
		title: 'Privacy',
		actionButton: 'Manage',
	},
	legalLinks: {
		privacyPolicy: 'Privacy policy',
		termsOfService: 'Terms of service',
		cookiePolicy: 'Cookie policy',
	},
};

function mergeTranslations(
	base: TranslationsResponse,
	override: Partial<TranslationsResponse> | undefined
): TranslationsResponse {
	if (!override || typeof override !== 'object') return base;
	return {
		...base,
		...override,
		common: { ...base.common, ...override.common },
		cookieBanner: { ...base.cookieBanner, ...override.cookieBanner },
		consentManagerDialog: {
			...base.consentManagerDialog,
			...override.consentManagerDialog,
		},
		consentTypes: {
			...base.consentTypes,
			...override.consentTypes,
		},
		frame: { ...base.frame, ...override.frame },
		legalLinks: { ...base.legalLinks, ...override.legalLinks },
	};
}

function resolveTranslations(options: ProviderOptions, locale?: string) {
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
}

function isIabComponent(component: MountableComponent): boolean {
	return (
		component === 'iab-consent-banner' || component === 'iab-consent-dialog'
	);
}

function policyModelFor(opts: MountOptions): 'opt-in' | 'opt-out' | 'iab' {
	if (isIabComponent(opts.component)) return 'iab';
	return opts.policy?.model ?? 'opt-in';
}

function buildInitOutput(
	opts: MountOptions,
	options: ProviderOptions
): InitOutput {
	const consentCategories =
		options.consentCategories?.length === 0
			? [...DEFAULT_CONSENT_CATEGORIES]
			: [...(options.consentCategories ?? DEFAULT_CONSENT_CATEGORIES)];

	return {
		jurisdiction: 'GDPR',
		location: {
			countryCode: 'DE',
			regionCode: null,
		},
		translations: resolveTranslations(options, opts.locale),
		branding: 'c15t',
		policy: {
			id: 'vue_conformance_policy',
			model: policyModelFor(opts),
			consent: {
				categories: consentCategories,
				scopeMode: 'permissive',
				...(opts.policy?.respectGpc === undefined
					? {}
					: { gpc: opts.policy.respectGpc }),
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['reject', 'accept', 'customize'],
					scrollLock: false,
				},
				dialog: {
					allowedActions: ['reject', 'accept', 'customize'],
					scrollLock: false,
				},
			},
		},
		policyDecision: {
			policyId: 'vue_conformance_policy',
			fingerprint: 'vue_conformance_fingerprint',
			matchedBy: 'default',
			country: 'DE',
			region: null,
			jurisdiction: 'GDPR',
		},
		policySnapshotToken: 'vue_conformance_token',
	};
}

function buildKernelConfig(
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
		initialConsents: state?.consents,
		initialHasConsented: state?.hasConsented,
		initialTranslations: resolveTranslations(options, opts.locale),
		...(opts.gpc === undefined ? {} : { initialOverrides: { gpc: opts.gpc } }),
		...(isIabComponent(opts.component)
			? {
					initialIab: {
						enabled: true,
						gvl: MINIMAL_GVL as unknown as GlobalVendorList,
						cmpId: IAB_FIXTURE_CMP_ID,
					},
				}
			: {}),
		transport,
	};
	if (initMode === 'authoritative') {
		return {
			...base,
			initialLocation: {
				countryCode: 'DE',
				regionCode: null,
			},
			initialBranding: 'c15t',
			initialPolicy: buildInitOutput(opts, options).policy,
			initialPolicyDecision: {
				policyId: 'vue_conformance_policy',
				fingerprint: 'vue_conformance_fingerprint',
				matchedBy: 'default',
				country: 'DE',
				region: null,
				jurisdiction: 'GDPR',
			},
			initialPolicySnapshotToken: 'vue_conformance_token',
		};
	}
	return {
		...base,
		initialPolicy: buildInitOutput(opts, options).policy,
		initialPolicyProvisional: true,
	};
}

function snapshotToInitOutputForTest(
	snapshot: ConsentSnapshot
): InitOutput | undefined {
	if (!(snapshot.translations || snapshot.policy || snapshot.location)) {
		return undefined;
	}
	return {
		jurisdiction: snapshot.policyDecision?.jurisdiction ?? 'NONE',
		location: snapshot.location ?? {
			countryCode: null,
			regionCode: null,
		},
		translations:
			snapshot.translations ?? resolveTranslations({} as ProviderOptions),
		branding: snapshot.branding ?? 'c15t',
		gvl: snapshot.iab?.gvl ?? undefined,
		customVendors: snapshot.iab?.customVendors,
		cmpId: snapshot.iab?.cmpId ?? undefined,
		policy: snapshot.policy ?? undefined,
		policyDecision: snapshot.policyDecision ?? undefined,
		policySnapshotToken: snapshot.policySnapshotToken ?? undefined,
	} as InitOutput;
}

function snapshotToStoredConsentForTest(snapshot: ConsentSnapshot) {
	const categories: Record<string, boolean> = {};
	if (snapshot.hasConsented) {
		for (const [category, enabled] of Object.entries(snapshot.consents)) {
			categories[category] = enabled;
		}
	}
	return { policies: {}, categories };
}

function mockFetch(init: InitOutput): typeof fetch {
	return vi.fn(async (input: RequestInfo | URL, request?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/init')) {
			return new Response(JSON.stringify(init), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}
		if (url.endsWith('/subjects')) {
			const body = JSON.parse(String(request?.body ?? '{}')) as {
				subjectId?: string;
			};
			return new Response(
				JSON.stringify({ ok: true, subjectId: body.subjectId }),
				{
					status: 200,
					headers: { 'content-type': 'application/json' },
				}
			);
		}
		return new Response('not found', { status: 404 });
	}) as unknown as typeof fetch;
}

function buildConfig(opts: MountOptions, init: InitOutput): ConsentConfig {
	const provided = (opts.providerOptions ?? {}) as ProviderOptions;
	return {
		...provided,
		backendURL: 'https://consent.example',
		domain: 'consent.example',
		consentCategories: provided.consentCategories ?? [
			...DEFAULT_CONSENT_CATEGORIES,
		],
		customFetch: mockFetch(init),
		disableAnimation: true,
		trapFocus: provided.trapFocus ?? false,
		hideBranding: true,
	} as ConsentConfig;
}

function provideContext(
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
}

function componentFor(component: MountableComponent) {
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
}

function createHarness(
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

	if (opts.initialState && typeof opts.initialState === 'object') {
		const state = opts.initialState as {
			consents?: Record<string, boolean>;
			hasConsented?: boolean;
			activeUI?: 'none' | 'banner' | 'dialog';
		};
		if (state.consents) context.kernel.set.consent(state.consents);
		if (state.hasConsented !== undefined) {
			context.kernel.set.hasConsented(state.hasConsented);
		}
		if (state.activeUI) context.kernel.set.activeUI(state.activeUI);
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
}

function createContext(opts: MountOptions) {
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
		context,
		config,
		options,
	};
}

function createPendingInit() {
	let resolve!: () => void;
	const promise = new Promise<Record<string, never>>((settle) => {
		resolve = () => settle({});
	});
	return { promise, resolve };
}

function createLifecycleTransport(opts: MountOptions) {
	if ((opts.initMode ?? 'authoritative') === 'pending') {
		const deferred = createPendingInit();
		return {
			transport: {
				init: () => deferred.promise,
			},
			resolve: deferred.resolve,
		};
	}
	if (opts.initMode === 'failing') {
		return {
			transport: {
				async init() {
					throw new Error('conformance: init failed');
				},
			},
			resolve: undefined,
		};
	}
	const init = buildInitOutput(
		opts,
		(opts.providerOptions ?? {}) as ProviderOptions
	);
	return {
		transport: {
			async init() {
				return {
					location: init.location,
					translations: init.translations,
					// InitOutput branding includes 'none'; InitResponse does not.
					branding: init.branding === 'none' ? undefined : init.branding,
					policy: init.policy,
					policyDecision: init.policyDecision,
					policySnapshotToken: init.policySnapshotToken,
				};
			},
		},
		resolve: undefined,
	};
}

function createControlledContext(opts: MountOptions) {
	const options = (opts.providerOptions ?? {}) as ProviderOptions;
	const lifecycle = createLifecycleTransport(opts);
	const config = buildConfig(opts, buildInitOutput(opts, options));
	const kernel: ConsentKernel = createConsentKernel(
		buildKernelConfig(opts, options, lifecycle.transport)
	);
	const snapshot = shallowRef(kernel.getSnapshot());
	const unsubscribe = kernel.subscribe((next) => {
		snapshot.value = next;
	});
	const context: VueConsentKernelContext = {
		kernel,
		snapshot,
		init: computed(() => snapshotToInitOutputForTest(snapshot.value)),
		activeUI: computed({
			get: () => {
				const activeUI = snapshot.value.activeUI;
				if (activeUI === 'dialog') return 'manager';
				if (activeUI === 'none') return null;
				return activeUI;
			},
			set: (value) => {
				if (value === 'manager') kernel.set.activeUI('dialog');
				else if (value === null) kernel.set.activeUI('none');
				else kernel.set.activeUI(value);
			},
		}),
		storedConsent: computed({
			get: () => snapshotToStoredConsentForTest(snapshot.value),
			set: (value) => {
				kernel.set.consent(value.categories);
			},
		}),
		dispose() {
			unsubscribe();
		},
	};
	return {
		context,
		config,
		options,
		resolveInit: lifecycle.resolve,
	};
}

function activeUIForStore(activeUI: string | null): StoreState['activeUI'] {
	if (activeUI === 'banner' || activeUI === 'dialog') return activeUI;
	return 'none';
}

function projectStoreState(context: VueConsentKernelContext): StoreState {
	const snapshot = context.kernel.getSnapshot();
	const consents = { ...snapshot.consents } as Record<string, boolean>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		consents,
		selectedConsents: { ...consents },
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyCategories],
	};
}

async function flushScheduler() {
	await flushPromises();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

let lastContext: VueConsentKernelContext | null = null;

const driver: TestDriver = {
	framework: 'vue',
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
			root: container,
			resolveInit: resolveInit
				? async () => {
						resolveInit();
						await flushScheduler();
					}
				: undefined,
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
				if (lastContext === context) lastContext = null;
			},
		};
	},
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
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
