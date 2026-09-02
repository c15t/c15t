import { readStoredConsentFromCookie } from '@c15t/core/v3/modules/persistence';
import type { InitOutput } from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createSSRApp, defineComponent } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { c15tVue } from '../index';
import ConsentRoot from '../runtime/components/consent-root.vue';
import { consentConfigKey } from '../runtime/composables/config';
import { useHasConsent as getConsentedCategories } from '../runtime/composables/consent';
import type { ConsentConfig } from '../runtime/config';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import type {
	RuntimeConsentConfig,
	VueConsentKernelContext,
} from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
};

const initFixture: InitOutput = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: null,
	},
	policy: {
		consent: {
			categories: ['necessary', 'measurement', 'marketing'],
			preselectedCategories: ['necessary', 'measurement', 'marketing'],
			scopeMode: 'strict',
		},
		id: 'policy_gdpr',
		model: 'opt-in',
		ui: {
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
			},
			mode: 'banner',
		},
	},
	policyDecision: {
		country: 'DE',
		fingerprint: 'fingerprint_gdpr',
		jurisdiction: 'GDPR',
		matchedBy: 'country',
		policyId: 'policy_gdpr',
		region: null,
	},
	policySnapshotToken: 'token_gdpr',
	translations: {
		language: 'en',
		translations: {
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
					description: 'Advertising cookies.',
					title: 'Marketing',
				},
				measurement: {
					description: 'Analytics cookies.',
					title: 'Measurement',
				},
				necessary: {
					description: 'Required cookies.',
					title: 'Necessary',
				},
			},
			cookieBanner: {
				description: 'Pick how c15t may use cookies.',
				title: 'Cookie choices',
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
		},
	},
};

const createFetchMock = function createFetchMock() {
	const subjectBodies: unknown[] = [];
	const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/init')) {
			return new Response(JSON.stringify(initFixture), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			});
		}
		if (url.endsWith('/subjects')) {
			const body = JSON.parse(String(init?.body ?? '{}')) as {
				subjectId?: string;
			};
			subjectBodies.push(body);
			return new Response(
				JSON.stringify({ ok: true, subjectId: body.subjectId }),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			);
		}
		return new Response('not found', { status: 404 });
	});

	return { fetchMock, subjectBodies };
};

const mountRoot = async function mountRoot() {
	const { fetchMock, subjectBodies } = createFetchMock();
	vi.stubGlobal('fetch', fetchMock);
	const wrapper = mount(ConsentRoot, {
		global: {
			plugins: [
				[
					c15tVue,
					{
						backendURL: 'https://consent.example',
						consentCategories: ['necessary', 'measurement', 'marketing'],
						domain: 'consent.example',
					},
				],
			],
		},
	});
	await flushPromises();
	return { fetchMock, subjectBodies, wrapper };
};

const mountRootWithConsentProbe = async function mountRootWithConsentProbe() {
	const { fetchMock, subjectBodies } = createFetchMock();
	vi.stubGlobal('fetch', fetchMock);
	const Probe = defineComponent({
		components: { ConsentRoot },
		setup() {
			return { hasConsent: getConsentedCategories() };
		},
		template:
			'<ConsentRoot /><div data-testid="granted-categories">{{ hasConsent.join(",") }}</div>',
	});
	const wrapper = mount(Probe, {
		global: {
			plugins: [
				[
					c15tVue,
					{
						backendURL: 'https://consent.example',
						consentCategories: ['necessary', 'measurement', 'marketing'],
						domain: 'consent.example',
					},
				],
			],
		},
	});
	await flushPromises();
	return { fetchMock, subjectBodies, wrapper };
};

const provideContext = function provideContext(
	app: ReturnType<typeof createSSRApp>,
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

const renderRootToString = async function renderRootToString(
	cookieHeader?: string
) {
	const { fetchMock } = createFetchMock();
	const config: RuntimeConsentConfig = {
		backendURL: 'https://consent.example',
		consentCategories: ['necessary', 'measurement', 'marketing'],
		customFetch: fetchMock as unknown as typeof fetch,
		domain: 'consent.example',
	};
	const initialStoredConsent = readStoredConsentFromCookie(
		cookieHeader,
		config.storageConfig
	);
	const context = createVueConsentKernelContext({
		config,
		initialStoredConsent,
		prefetch: initFixture,
	});

	try {
		const app = createSSRApp(ConsentRoot);
		provideContext(app, context, config);
		const ssrContext: { teleports?: Record<string, string> } = {};
		const appHtml = await renderToString(app, ssrContext);
		const html = [appHtml, ...Object.values(ssrContext.teleports ?? {})].join(
			''
		);
		return { context, html };
	} catch (error) {
		context.dispose();
		throw error;
	}
};

beforeEach(() => {
	delete (window as WindowWithC15t).c15t;
	document.body.innerHTML = '';
	window.localStorage.clear();
	document.cookie = 'c15t=; max-age=0; path=/';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	delete (window as WindowWithC15t).c15t;
	document.body.innerHTML = '';
	window.localStorage.clear();
	document.cookie = 'c15t=; max-age=0; path=/';
});

describe('@c15t/vue kernel runtime', () => {
	test('disposes the kernel with its Vue context', () => {
		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://consent.example',
				customFetch: vi.fn() as unknown as typeof fetch,
			},
		});
		const dispose = vi.spyOn(context.kernel, 'dispose');

		context.dispose();
		expect(dispose).toHaveBeenCalledOnce();
	});

	test('installs window.c15t with Vue hosted identity', async () => {
		const { wrapper } = await mountRoot();

		expect((window as WindowWithC15t).c15t).toMatchObject({
			mode: 'hosted',
			pkg: '@c15t/vue',
		});
		expect(typeof (window as WindowWithC15t).c15t?.version).toBe('string');

		wrapper.unmount();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('renders the banner from kernel init state', async () => {
		const { wrapper } = await mountRoot();

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeTruthy();
		expect(document.body.textContent).toContain('Cookie choices');

		wrapper.unmount();
	});

	test('server-render starts from stored consent cookie and omits banner', async () => {
		const { context, html } = await renderRootToString(
			'c15t=c.necessary:1,c.measurement:1,c.marketing:1,i.sid:sub_111AEMh5qpiLmhEcbnqwrmsB7X,i.t:1234567890,i.y:all'
		);

		try {
			const snapshot = context.kernel.getSnapshot();
			expect(snapshot.hasConsented).toBe(true);
			expect(snapshot.activeUI).toBe('none');
			expect(snapshot.consents).toMatchObject({
				marketing: true,
				measurement: true,
				necessary: true,
			});
			expect(html).not.toContain('data-testid="consent-banner-root"');
			expect(html).not.toContain('Cookie choices');
		} finally {
			context.dispose();
		}
	});

	test('server-render keeps the banner for fresh visitors', async () => {
		const { context, html } = await renderRootToString();

		try {
			const snapshot = context.kernel.getSnapshot();
			expect(snapshot.hasConsented).toBe(false);
			expect(snapshot.activeUI).toBe('banner');
			expect(html).toContain('data-testid="consent-banner-root"');
			expect(html).toContain('Cookie choices');
		} finally {
			context.dispose();
		}
	});

	test('prefetch seeds overrides from init location and language', () => {
		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://consent.example',
				customFetch: vi.fn() as unknown as typeof fetch,
			},
			prefetch: {
				...initFixture,
				location: { countryCode: 'US', regionCode: 'CA' },
				translations: {
					...initFixture.translations,
					language: 'de',
				},
			},
		});

		try {
			expect(context.kernel.getSnapshot().overrides).toMatchObject({
				country: 'US',
				language: 'de',
				region: 'CA',
			});
		} finally {
			context.dispose();
		}
	});

	test('fresh visitor useHasConsent only reports necessary under opt-in policy', async () => {
		const { wrapper } = await mountRootWithConsentProbe();

		expect(wrapper.find('[data-testid="granted-categories"]').text()).toBe(
			'necessary'
		);

		wrapper.unmount();
	});

	test('hides the banner on consent and posts through the hosted transport', async () => {
		const { wrapper, subjectBodies } = await mountRoot();

		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-accept-button"]'
			)
			?.click();
		await flushPromises();
		await Promise.resolve();

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeNull();
		// The kernel defers transport.save a macrotask so the UI commit paints
		// first — the POST lands shortly after the banner is gone.
		await vi.waitFor(() => {
			expect(subjectBodies).toHaveLength(1);
		});
		expect(subjectBodies[0]).toMatchObject({
			consentAction: 'all',
			domain: 'consent.example',
			policySnapshotToken: 'token_gdpr',
			preferences: {
				marketing: true,
				measurement: true,
				necessary: true,
			},
			type: 'cookie_banner',
		});

		wrapper.unmount();
	});

	test('persists consent when accepting all from the dialog', async () => {
		const { wrapper } = await mountRoot();

		const customizeButton = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-customize-button"]'
		);
		if (!customizeButton) {
			throw new Error('Customize button was not rendered');
		}
		customizeButton.click();
		await flushPromises();

		await vi.waitFor(() => {
			expect(
				document.querySelector(
					'[data-testid="consent-widget-footer-accept-all-button"]'
				)
			).toBeTruthy();
		});
		const acceptAllButton = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-widget-footer-accept-all-button"]'
		);
		if (!acceptAllButton) {
			throw new Error('Dialog accept-all button was not rendered');
		}
		acceptAllButton.click();
		await flushPromises();
		await Promise.resolve();

		await vi.waitFor(() => {
			expect(window.localStorage.getItem('c15t')).toBeTruthy();
		});
		const stored = JSON.parse(window.localStorage.getItem('c15t') ?? '{}');
		expect(stored).toMatchObject({
			consentInfo: {
				subjectId: expect.stringMatching(/^sub_/u),
			},
			consents: {
				marketing: true,
				measurement: true,
				necessary: true,
			},
		});
		expect(document.cookie).toContain('c15t=');

		wrapper.unmount();
	});

	test('persists consent with the v2-compatible c15t storage payload', async () => {
		const { wrapper } = await mountRoot();

		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-reject-button"]'
			)
			?.click();
		await flushPromises();
		await Promise.resolve();

		await vi.waitFor(() => {
			expect(window.localStorage.getItem('c15t')).toBeTruthy();
		});
		const stored = JSON.parse(window.localStorage.getItem('c15t') ?? '{}');
		expect(stored).toMatchObject({
			consentInfo: {
				subjectId: expect.stringMatching(/^sub_/u),
			},
			consents: {
				marketing: false,
				measurement: false,
				necessary: true,
			},
		});
		expect(document.cookie).toContain('c15t=');

		wrapper.unmount();
	});

	test('network blocker wiring blocks matched requests until consent', async () => {
		const { fetchMock } = createFetchMock();
		const onRequestBlocked = vi.fn();
		const config: RuntimeConsentConfig = {
			backendURL: 'https://consent.example',
			consentCategories: ['necessary', 'measurement', 'marketing'],
			customFetch: fetchMock as unknown as typeof fetch,
			domain: 'consent.example',
			iframeBlocker: false,
			networkBlocker: {
				logBlockedRequests: false,
				onRequestBlocked,
				rules: [{ category: 'marketing', domain: 'tracker.example' }],
			},
		};
		const context = createVueConsentKernelContext({
			config,
			prefetch: initFixture,
		});
		const stop = startVueConsentRuntime(context, config, { runInit: false });

		try {
			const blocked = await window.fetch('https://tracker.example/pixel');
			expect(blocked.status).toBe(451);
			expect(onRequestBlocked).toHaveBeenCalledTimes(1);

			context.kernel.set.consent({ marketing: true });
			// jsdom has no real network — reaching the (failing) transport is
			// enough to prove the request was allowed through the blocker.
			await window.fetch('https://tracker.example/pixel').catch(() => null);
			expect(onRequestBlocked).toHaveBeenCalledTimes(1);
		} finally {
			stop();
		}
	});

	// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
	test('iframe blocker is wired by default and honors opting out', async () => {
		const { fetchMock } = createFetchMock();
		const baseConfig: RuntimeConsentConfig = {
			backendURL: 'https://consent.example',
			consentCategories: ['necessary', 'measurement', 'marketing'],
			customFetch: fetchMock as unknown as typeof fetch,
			domain: 'consent.example',
		};

		const gated = document.createElement('iframe');
		gated.setAttribute('data-category', 'marketing');
		gated.setAttribute('src', 'https://embed.example/video');
		document.body.appendChild(gated);

		const context = createVueConsentKernelContext({
			config: baseConfig,
			prefetch: initFixture,
		});
		const stop = startVueConsentRuntime(context, baseConfig, {
			runInit: false,
		});
		try {
			// Default wiring strips the src of consent-gated iframes.
			expect(gated.getAttribute('src')).toBeNull();
		} finally {
			stop();
			gated.remove();
		}

		const untouched = document.createElement('iframe');
		untouched.setAttribute('data-category', 'marketing');
		untouched.setAttribute('src', 'https://embed.example/video');
		document.body.appendChild(untouched);

		const optOutConfig: RuntimeConsentConfig = {
			...baseConfig,
			iframeBlocker: false,
		};
		const optOutContext = createVueConsentKernelContext({
			config: optOutConfig,
			prefetch: initFixture,
		});
		const stopOptOut = startVueConsentRuntime(optOutContext, optOutConfig, {
			runInit: false,
		});
		try {
			expect(untouched.getAttribute('src')).toBe('https://embed.example/video');
		} finally {
			stopOptOut();
			untouched.remove();
		}
	});
});
