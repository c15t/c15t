import { C15T_POLICY_CONTRACT_HEADER } from '@c15t/core';
import type { InitOutput } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, expect, test, vi } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick, shallowRef } from 'vue';
import type { App, ShallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';

import ConsentBanner from '../runtime/components/prompt.vue';
import { useConsentKernelContext } from '../runtime/composables/kernel';
import type { VueConsentKernelContext } from '../runtime/kernel';

const nuxt = vi.hoisted(() => ({
	event: undefined as { context: Record<string, unknown> } | undefined,
	fetches: 0,
	headers: {} as Record<string, string | undefined>,
	response: undefined as InitOutput | undefined,
	state: new Map<string, ShallowRef<unknown>>(),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test preserves its request-state and fetch-cache semantics.
vi.mock('#imports', async () => {
	const { shallowRef: makeRef } = await import('vue');
	return {
		defineNuxtPlugin: (plugin: unknown) => plugin,
		useAppConfig: () => ({
			c15t: {
				backendURL: 'https://consent.example',
				consentCategories: ['necessary', 'measurement', 'marketing'],
				disableAnimation: true,
				iframeBlocker: false,
			},
		}),
		useFetch: (
			_url: string,
			options: {
				onResponse: (context: { response: { headers: Headers } }) => void;
			}
		) => {
			nuxt.fetches += 1;
			options.onResponse({
				response: {
					headers: new Headers({ [C15T_POLICY_CONTRACT_HEADER]: '1' }),
				},
			});
			return Promise.resolve({ data: makeRef(nuxt.response) });
		},
		useHead: () => undefined,
		useRequestEvent: () => nuxt.event,
		useRequestHeaders: () => nuxt.headers,
		useRuntimeConfig: () => ({ public: { c15t: {} } }),
		useState: (key: string, init: () => unknown) => {
			if (!nuxt.state.has(key)) {
				nuxt.state.set(key, makeRef(init()));
			}
			return nuxt.state.get(key);
		},
	};
});

type NuxtPlugin = (app: {
	hook: (name: string, callback: () => void) => void;
	payload: { prerenderedAt?: number };
	vueApp: App;
}) => Promise<void>;

const resolution = writePolicyResolutionWire(
	resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				categories: ['measurement', 'marketing'],
				id: 'policy_gdpr',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'strict',
			},
		],
	})
);

const visitorInit: InitOutput = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: resolution,
	translations: { language: 'en', translations },
};

// A returning visitor who rejected everything. Nitro renders a cached
// route without this cookie; a prerender never has one.
const visitorHeaders = {
	'accept-language': 'de-DE',
	cookie: 'c15t=unreadable',
	'x-vercel-ip-country': 'DE',
};

let context!: VueConsentKernelContext;
const Probe = defineComponent({
	setup() {
		context = useConsentKernelContext();
		return () => h('div', [h(ConsentBanner)]);
	},
});

const loadPlugin = async (): Promise<NuxtPlugin> =>
	(await vi.importActual<{ default: NuxtPlugin }>('../runtime/plugin.nuxt'))
		.default;

const renderOnServer = async function renderOnServer(
	payload: { prerenderedAt?: number },
	event: { context: Record<string, unknown> }
) {
	nuxt.event = event;
	nuxt.headers = visitorHeaders;
	nuxt.response = visitorInit;
	nuxt.fetches = 0;
	const plugin = await loadPlugin();
	const app = createSSRApp(Probe);
	vi.stubGlobal('window', undefined);
	vi.stubGlobal('document', undefined);
	try {
		await plugin({
			hook: () => {
				throw new Error('Server must not start browser lifecycle');
			},
			payload,
			vueApp: app,
		});
		const html = await renderToString(app);
		context.dispose();
		return html;
	} finally {
		vi.unstubAllGlobals();
		nuxt.event = undefined;
	}
};

const stateValue = (key: string): unknown => nuxt.state.get(key)?.value;

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	nuxt.state.clear();
	localStorage.clear();
	document.body.replaceChildren();
});

test.each([
	['a prerendered route', { prerenderedAt: 1 }, {}],
	[
		'an swr route rule',
		{},
		{ _nitro: { routeRules: { cache: { maxAge: 60, swr: true } } } },
	],
	['an isr route rule', {}, { _nitro: { routeRules: { isr: 60 } } }],
	['a Nitro cached render', {}, { cache: { options: {} } }],
])(
	'HTML shared by %s carries no visitor state',
	async (_name, payload, eventContext) => {
		const html = await renderOnServer(payload, { context: eventContext });

		expect(nuxt.fetches).toBe(0);
		expect(stateValue('c15t:records')).toBeUndefined();
		expect(stateValue('c15t:request-headers')).toEqual({});
		expect(html).not.toContain('consent-banner-root');
	}
);

test('a per-request render still prefetches for its visitor', async () => {
	await renderOnServer(
		{},
		{ context: { _nitro: { routeRules: { cache: false } } } }
	);

	expect(nuxt.fetches).toBe(1);
	expect(stateValue('c15t:records')).toBeDefined();
	expect(stateValue('c15t:request-headers')).toMatchObject({
		'accept-language': 'de-DE',
		'x-vercel-ip-country': 'DE',
	});
});

test('the browser resolves a prerendered page itself and keeps a stored rejection', async () => {
	const payload = { prerenderedAt: 1 };
	const html = await renderOnServer(payload, { context: {} });
	const serialized = JSON.stringify(
		[...nuxt.state].map(([key, value]) => [key, value.value ?? null])
	);
	nuxt.state = new Map(
		(JSON.parse(serialized) as [string, unknown][]).map(([key, value]) => [
			key,
			shallowRef(value ?? undefined),
		])
	);
	nuxt.headers = {};
	nuxt.fetches = 0;

	if (resolution.status !== 'matched') {
		throw new Error('Expected a matched fixture');
	}
	const denial = {
		basis: { fingerprint: resolution.fingerprints.choice, kind: 'choice-v1' },
		confirmedAt: Date.now() - 1000,
		value: false,
	};
	localStorage.setItem(
		'c15t',
		JSON.stringify({
			categories: { marketing: denial, measurement: denial },
			version: 3,
		})
	);
	const initRequests: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn((input: RequestInfo | URL) => {
			initRequests.push(String(input));
			return Promise.resolve(
				new Response(JSON.stringify(visitorInit), {
					headers: {
						'content-type': 'application/json',
						[C15T_POLICY_CONTRACT_HEADER]: '1',
					},
					status: 200,
				})
			);
		})
	);

	const plugin = await loadPlugin();
	const app = createSSRApp(Probe);
	let mounted: (() => void) | undefined;
	await plugin({
		hook: (name, lifecycle) => {
			if (name === 'app:mounted') {
				mounted = lifecycle;
			}
		},
		payload,
		vueApp: app,
	});
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.append(container);
	app.mount(container);
	try {
		expect(nuxt.fetches).toBe(0);
		mounted?.();
		await vi.waitFor(() => {
			expect(context.snapshot.value.resolution.status).toBe('matched');
		});
		await nextTick();

		expect(initRequests).toEqual(['https://consent.example/init']);
		expect(context.snapshot.value.explicitChoice?.categories).toMatchObject({
			marketing: { value: false },
			measurement: { value: false },
		});
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeNull();
	} finally {
		app.unmount();
	}
});
