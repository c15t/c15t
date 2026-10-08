/**
 * The `/init` script the Nitro plugin writes into `ssr: false` pages, from
 * the server's `render:html` hook through the browser: the HTML starts the
 * request and the Nuxt plugin's runtime adopts it.
 */
import { C15T_POLICY_CONTRACT_HEADER } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';
import type { App, Ref } from 'vue';

import ConsentBanner from '../runtime/components/prompt.vue';
import { buildInitPrefetchTag } from '../runtime/server/init-prefetch';

const nuxt = vi.hoisted(() => ({
	appConfig: {} as Record<string, unknown>,
	/** Whether Nitro can load `app.config.ts`; it cannot without auto-imports. */
	serverAppConfig: true,
	ssr: true,
	state: new Map<string, Ref<unknown>>(),
}));
// Hoisted with the mocks below, which both read it.
const useRuntimeConfig = vi.hoisted(() => () => ({
	c15t: { ssr: nuxt.ssr },
	public: { c15t: { backendURL: '/api/c15t', manifest: false } },
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nitro supplies this runtime; the test provides the config the server plugin reads.
vi.mock('nitropack/runtime', () => ({
	defineNitroPlugin: (plugin: unknown) => plugin,
	getRouteRules: (event: TestEvent) => event.rules,
	useRuntimeConfig,
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- The module registers this Nitro virtual; the test provides the app config it returns.
vi.mock('#c15t/server-app-config', () => ({
	useServerAppConfig: () =>
		nuxt.serverAppConfig ? { c15t: nuxt.appConfig } : undefined,
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test provides the config the Nuxt plugin reads.
vi.mock('#imports', () => ({
	defineNuxtPlugin: (plugin: unknown) => plugin,
	useAppConfig: () => ({ c15t: nuxt.appConfig }),
	useHead: () => undefined,
	useRequestEvent: () => undefined,
	useRequestHeaders: () => ({}),
	useRequestURL: () => new URL('http://localhost/'),
	useRuntimeConfig,
	useState: (key: string, init: () => unknown) => {
		if (!nuxt.state.has(key)) {
			nuxt.state.set(key, ref(init()));
		}
		return nuxt.state.get(key);
	},
}));

interface TestEvent {
	context: Record<string, unknown>;
	headers: Record<string, string>;
	rules: Record<string, unknown>;
}

interface HtmlContext {
	head: string[];
}

type RenderHTMLHook = (
	html: HtmlContext,
	context: { event: TestEvent; streaming?: boolean }
) => void;

const SHELL_HEAD =
	'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="stylesheet" href="/_nuxt/entry.css" crossorigin>\n<script type="module" src="/_nuxt/entry.js" crossorigin></script>';

/** The `<head>` the Nitro plugin leaves for one render. */
const renderHead = async function renderHead(
	event: Partial<TestEvent> = {},
	streaming?: boolean
): Promise<string> {
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			hooks: { hook: (name: string, hook: RenderHTMLHook) => void };
		}) => void;
	}>('../runtime/server/init-prefetch.nuxt');
	let renderHTML: RenderHTMLHook | undefined;
	plugin({
		hooks: {
			hook: (name, hook) => {
				expect(name).toBe('render:html');
				renderHTML = hook;
			},
		},
	});
	const html = { head: [SHELL_HEAD] };
	renderHTML?.(html, {
		event: { context: {}, headers: {}, rules: { ssr: false }, ...event },
		streaming,
	});
	return html.head.join('');
};

const runInlineScript = function runInlineScript(head: string): void {
	const source =
		/<script(?: nonce="[^"]*")?>(?<source>[\s\S]*?)<\/script>/u.exec(head)
			?.groups?.source;
	expect(source).toBeDefined();
	window.eval(source ?? '');
};

const policy = normalizePolicyRule({
	categories: ['marketing'],
	id: 'nuxt-client',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
});
const initResponse: InitOutput = {
	branding: 'none',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire({
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'fallback',
		policy,
		policyId: policy.id,
		status: 'matched',
	}),
	translations: { language: 'en', translations },
};
const respond = () =>
	new Response(JSON.stringify(initResponse), {
		headers: { [C15T_POLICY_CONTRACT_HEADER]: '1' },
	});

/** Run the Nuxt plugin as on an `ssr: false` page, and mount the banner. */
const startApp = async function startApp(): Promise<App> {
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			payload: { serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	const app = createApp(defineComponent({ render: () => h(ConsentBanner) }));
	await plugin({ hook: () => undefined, payload: {}, vueApp: app });
	const container = document.createElement('div');
	document.body.append(container);
	app.mount(container);
	return app;
};

const bannerShown = () =>
	vi.waitFor(() =>
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull()
	);

const initRequests = (fetch: ReturnType<typeof vi.fn>) =>
	fetch.mock.calls.filter(([input]) =>
		// The path alone: the runtime adds its consent journey as a query.
		String(input).split('?')[0]?.endsWith('/init')
	);

beforeEach(() => {
	delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
	nuxt.appConfig = { disableAnimation: true, iframeBlocker: false };
	nuxt.serverAppConfig = true;
	nuxt.ssr = true;
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	nuxt.state.clear();
	Reflect.deleteProperty(window, '__c15tInitialDataPromises');
	document.body.replaceChildren();
});

describe('an ssr: false page', () => {
	test('starts /init from its HTML, and the app uses that request', async () => {
		const fetch = vi.fn(() => Promise.resolve(respond()));
		vi.stubGlobal('fetch', fetch);
		runInlineScript(await renderHead());
		// The request leaves while the HTML is parsed, before any app code.
		expect(initRequests(fetch)).toHaveLength(1);
		const sent = new URL(String(initRequests(fetch)[0]?.[0]));
		expect(`${sent.origin}${sent.pathname}`).toBe(
			`${window.location.origin}/api/c15t/init`
		);
		// It starts the page's consent journey, which the runtime continues.
		expect(sent.searchParams.get('c15tJourneyScope')).toBe('page');
		expect(sent.searchParams.get('c15tJourney')).toBe(
			(window as Window & { __c15tJourney?: { id: string } }).__c15tJourney?.id
		);
		const app = await startApp();
		try {
			await bannerShown();
			expect(initRequests(fetch)).toHaveLength(1);
		} finally {
			app.unmount();
		}
	});

	test('waits for an early request that answers after the app starts', async () => {
		let answer!: (response: Response) => void;
		const fetch = vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					answer = resolve;
				})
		);
		vi.stubGlobal('fetch', fetch);
		runInlineScript(await renderHead());
		const app = await startApp();
		try {
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
			expect(initRequests(fetch)).toHaveLength(1);
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeNull();
			answer(respond());
			await bannerShown();
			expect(initRequests(fetch)).toHaveLength(1);
		} finally {
			app.unmount();
		}
	});

	test('asks once more, and only once, when the early request fails', async () => {
		const fetch = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockImplementation(() => Promise.resolve(respond()));
		vi.stubGlobal('fetch', fetch);
		runInlineScript(await renderHead());
		const app = await startApp();
		try {
			await bannerShown();
			expect(initRequests(fetch)).toHaveLength(2);
		} finally {
			app.unmount();
		}
	});

	test('asks once more when the early request gets an error status', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response('{}', { status: 503 }))
			.mockImplementation(() => Promise.resolve(respond()));
		vi.stubGlobal('fetch', fetch);
		runInlineScript(await renderHead());
		const app = await startApp();
		try {
			await bannerShown();
			expect(initRequests(fetch)).toHaveLength(2);
		} finally {
			app.unmount();
		}
	});
});

describe('which pages get the script', () => {
	test('every page of an app with ssr: false', async () => {
		nuxt.ssr = false;
		expect(await renderHead({ rules: {} })).toContain(
			'__c15tInitialDataPromises'
		);
	});

	test('no server-rendered page', async () => {
		expect(await renderHead({ rules: {} })).toBe(SHELL_HEAD);
		expect(await renderHead({ rules: {} }, true)).toBe(SHELL_HEAD);
	});

	test('no route whose rule turns it off', async () => {
		expect(
			await renderHead({
				rules: { c15t: { initPrefetch: false }, ssr: false },
			})
		).toBe(SHELL_HEAD);
	});

	test('no app whose app config picks client manifest mode', async () => {
		nuxt.appConfig = { manifest: 'client' };
		expect(await renderHead()).toBe(SHELL_HEAD);
	});

	// Under Nuxt 5 Nitro has no auto-imports, so `app.config.ts`, which may
	// hold a `customFetch` that rules the script out, cannot load.
	test('no page when the server cannot read the app config', async () => {
		nuxt.serverAppConfig = false;
		expect(await renderHead()).toBe(SHELL_HEAD);
	});

	test('a shell Nuxt renders on request', async () => {
		expect(
			await renderHead({ context: { nuxt: { noSSR: true } }, rules: {} })
		).toContain('__c15tInitialDataPromises');
	});
});

describe('the script', () => {
	test('is the same for every visitor and carries nothing from the request', async () => {
		const first = await renderHead({
			context: { nuxt: {} },
			headers: { cookie: 'c15t=visitor-a', 'x-forwarded-for': '203.0.113.7' },
		});
		const second = await renderHead({
			headers: { 'accept-language': 'de', cookie: 'c15t=visitor-b' },
		});
		expect(first).toBe(second);
		expect(first).not.toMatch(/visitor-a|203\.0\.113\.7/u);
	});

	test("carries the response's CSP nonce, then the config's", async () => {
		expect(
			await renderHead({ context: { security: { nonce: 'per-request' } } })
		).toContain('<script nonce="per-request">');
		nuxt.appConfig = { nonce: 'from-config' };
		expect(await renderHead()).toContain('<script nonce="from-config">');
	});

	test('goes after the charset and before the stylesheet', async () => {
		const head = await renderHead();
		const script = head.indexOf('<script>');
		expect(script).toBeGreaterThan(head.indexOf('<meta charset="utf-8">'));
		expect(script).toBeLessThan(head.indexOf('<meta name="viewport"'));
		expect(script).toBeLessThan(head.indexOf('rel="stylesheet"'));
	});
});

describe('pages whose request the server cannot know get no script', () => {
	test.each([
		[
			'server manifest mode, which asks the Nuxt init route',
			{ manifest: 'server' },
		],
		['manifest: true', { manifest: true }],
		['a manifestURL without a mode', { manifestURL: 'https://cdn.example/m' }],
		['client manifest mode, which sends no /init', { manifest: 'client' }],
		[
			'a consentSource',
			{ consentSource: { subscribe: () => () => undefined } },
		],
		['a customFetch', { customFetch: globalThis.fetch }],
		[
			'an experiment, whose arm travels with /init',
			{ experiment: { arms: {}, id: 'x' } },
		],
		['a prefetch already in the config', { prefetch: initResponse }],
		[
			'a backend URL the browser would resolve against the page',
			{ backendURL: 'api/c15t' },
		],
	])('%s', (_name, config) => {
		expect(
			buildInitPrefetchTag({
				config: config as Parameters<typeof buildInitPrefetchTag>[0]['config'],
				shell: true,
			})
		).toBeUndefined();
	});

	test('an absolute backend and the default route both get one', () => {
		expect(
			buildInitPrefetchTag({
				config: { backendURL: 'https://consent.example/' },
				shell: true,
			})
		).toContain('"backendURL":"https://consent.example/"');
		expect(buildInitPrefetchTag({ config: {}, shell: true })).toContain(
			'"backendURL":"/api/c15t"'
		);
	});

	test('a nonce cannot close its attribute', () => {
		expect(
			buildInitPrefetchTag({ config: {}, nonce: 'a"b', shell: true })
		).toMatch(/^<script nonce="a&quot;b">/u);
	});
});
