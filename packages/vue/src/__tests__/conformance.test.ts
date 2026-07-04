/**
 * Vue conformance entry point.
 *
 * The Vue package exposes a Nuxt plugin rather than a standalone provider
 * component, so the driver builds the same kernel context the plugin provides
 * and injects it into a small Vue app around the requested component.
 */

import {
	DriverNotImplementedError,
	type MountableComponent,
	type MountOptions,
	type MountResult,
	runConformanceSuite,
	type SuiteApi,
	type TestDriver,
} from '@c15t/conformance';
import type { InitOutput, TranslationsResponse } from '@c15t/schema/types';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { type App, createApp, createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ConsentManager from '../runtime/components/consent-manager.vue';
import ConsentRoot from '../runtime/components/consent-root.vue';
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
			model: 'opt-in',
			consent: {
				categories: consentCategories,
				scopeMode: 'permissive',
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
		trapFocus: false,
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
		case 'consent-dialog':
			return ConsentRoot;
		case 'consent-widget':
			return defineComponent({
				name: 'VueConformanceWidget',
				setup() {
					return () =>
						h('div', { 'data-testid': 'consent-widget-root' }, [
							h(ConsentManager),
						]);
				},
			});
		case 'iab-consent-banner':
		case 'iab-consent-dialog':
			throw new DriverNotImplementedError('vue', `mount(${component})`);
	}
}

function createHarness(
	opts: MountOptions,
	options: ProviderOptions,
	context: VueConsentKernelContext
) {
	const Child = componentFor(opts.component);
	if (
		opts.component === 'consent-dialog' ||
		opts.component === 'consent-widget'
	) {
		context.kernel.set.activeUI('dialog');
	} else {
		context.kernel.set.activeUI('banner');
	}

	if (opts.initialState && typeof opts.initialState === 'object') {
		const state = opts.initialState as {
			consents?: Record<string, boolean>;
			activeUI?: 'none' | 'banner' | 'dialog';
		};
		if (state.consents) context.kernel.set.consent(state.consents);
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
					[h(Child, { language: opts.locale })]
				);
		},
	});
}

function createContext(opts: MountOptions) {
	const options = (opts.providerOptions ?? {}) as ProviderOptions;
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

let lastContext: VueConsentKernelContext | null = null;

const driver: TestDriver = {
	framework: 'vue',
	async mount(opts: MountOptions): Promise<MountResult> {
		const { context, config, options } = createContext(opts);
		lastContext = context;

		const container = document.createElement('div');
		document.body.appendChild(container);

		const app = createApp(createHarness(opts, options, context));
		provideContext(app, context, config);
		app.mount(container);
		await flushPromises();
		await new Promise((resolve) => setTimeout(resolve, 0));

		return {
			root: opts.component === 'consent-widget' ? document.body : container,
			unmount: async () => {
				app.unmount();
				await flushPromises();
				await new Promise((resolve) => setTimeout(resolve, 0));
				container.replaceChildren();
				container.remove();
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
			subscribe: (listener) =>
				(lastContext as VueConsentKernelContext).kernel.subscribe(() => {
					listener();
				}),
		};
	},
	async serverRender(opts: MountOptions): Promise<string> {
		const { context, config, options } = createContext(opts);
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
