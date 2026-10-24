import { C15T_POLICY_CONTRACT_HEADER } from '@c15t/core';
import type { ExternalConsentSource } from '@c15t/core/runtime';
import { resolveManifestInit } from '@c15t/core/transports/manifest-cache';
import {
	normalizePolicyRule,
	createConsentManifestPolicyPack,
	createPolicyRuleFingerprints,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import {
	createApp,
	createSSRApp,
	defineComponent,
	h,
	nextTick,
	ref,
} from 'vue';
import type { App, ShallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';

import ConsentBanner from '../runtime/components/prompt.vue';
import { useConsentKernelContext } from '../runtime/composables/kernel';
import type { VueConsentKernelContext } from '../runtime/kernel';

const nuxt = vi.hoisted(() => ({
	consentSource: undefined as ExternalConsentSource | undefined,
	cookies: [] as {
		name: string;
		options: Record<string, unknown>;
		value: unknown;
	}[],
	experiment: undefined as
		| { arm?: string; arms: Record<string, object>; id: string }
		| undefined,
	fetchHeaders: [] as Record<string, string>[],
	headers: {} as Record<string, string | undefined>,
	manifest: false as boolean | 'client',
	requests: 0,
	response: undefined as InitOutput | undefined,
	state: new Map<string, ShallowRef<unknown>>(),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test preserves its request-state and fetch-cache semantics.
vi.mock('#imports', async () => {
	// Deep, like Nuxt's payload state (`toRef(reactive(payload.state), key)`).
	const { ref: makeRef } = await import('vue');
	return {
		defineNuxtPlugin: (plugin: unknown) => plugin,
		useAppConfig: () => ({
			c15t: {
				backendURL: '/api/c15t',
				consentSource: nuxt.consentSource,
				disableAnimation: true,
				experiment: nuxt.experiment,
				hideBranding: true,
				iframeBlocker: false,
			},
		}),
		useCookie: (name: string, options: Record<string, unknown>) => {
			const cookie = { name, options, value: undefined as unknown };
			nuxt.cookies.push(cookie);
			return cookie;
		},
		useHead: () => undefined,
		// Nitro's in-process fetch on the event answers the app's own routes.
		useRequestEvent: () => ({
			context: {},
			fetch: (_input: string, init?: RequestInit) => {
				const headers = Object.fromEntries(new Headers(init?.headers));
				nuxt.fetchHeaders.push(headers);
				expect(headers[C15T_POLICY_CONTRACT_HEADER]).toBe('1');
				nuxt.requests += 1;
				return Promise.resolve(
					new Response(JSON.stringify(nuxt.response), {
						headers: { [C15T_POLICY_CONTRACT_HEADER]: '1' },
					})
				);
			},
		}),
		useRequestHeaders: () => nuxt.headers,
		useRequestURL: () => new URL('https://app.example/'),
		// `mode` comes from nuxt.config.ts, through the public runtime config.
		useRuntimeConfig: () => ({
			public: {
				c15t: {
					mode:
						nuxt.manifest === 'client'
							? { resolve: 'browser', type: 'manifest' }
							: { type: nuxt.manifest ? 'manifest' : 'hosted' },
				},
			},
		}),
		useState: (key: string, init: () => unknown) => {
			if (!nuxt.state.has(key)) {
				nuxt.state.set(key, makeRef(init()));
			}
			return nuxt.state.get(key);
		},
	};
});

const expectCompleteBanner = (scope: ParentNode) => {
	const root = scope.querySelector('[data-testid="consent-banner-root"]');
	const card = root?.querySelector('[data-testid="consent-banner-card"]');
	const marker = root?.querySelector<HTMLSpanElement>(
		':scope > span[data-c15t-stream-end]'
	);
	expect(root?.getAttribute('data-c15t-streamed')).toBe('');
	expect(root?.querySelectorAll('[data-c15t-stream-end]')).toHaveLength(1);
	expect(marker?.hidden).toBe(true);
	expect(root?.lastChild).toBe(marker);
	expect(marker?.previousElementSibling?.contains(card ?? null)).toBe(true);
	return { card, marker, root };
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	nuxt.state.clear();
	nuxt.cookies = [];
	nuxt.consentSource = undefined;
	nuxt.experiment = undefined;
	nuxt.fetchHeaders = [];
	document.body.replaceChildren();
});

test.each([false, true])('Nuxt hydrates GPC: manifest=%s', async (manifest) => {
	nuxt.manifest = manifest;
	const now = 1_800_000_000_000;
	const date = vi.spyOn(Date, 'now').mockReturnValue(now);
	const rule: PolicyRule = {
		categories: ['marketing'],
		id: 'nuxt-ssr',
		match: { fallback: true },
		model: 'opt-out',
		privacySignals: { gpc: { denyCategories: ['marketing'] } },
		prompt: 'notice',
		scopeMode: 'permissive',
	};
	const policy = normalizePolicyRule(rule);
	nuxt.response = {
		branding: 'none',
		location: { countryCode: 'DE', regionCode: null },
		policyResolution: writePolicyResolutionWire({
			fingerprints: createPolicyRuleFingerprints(policy),
			matchedBy: 'fallback',
			policy,
			policyId: policy.id,
			status: 'matched',
		}),
		translations: {
			language: 'en',
			translations: {
				...translations,
				cookieBanner: {
					description: 'Review your settings.',
					title: 'Privacy notice',
				},
			},
		},
	};
	nuxt.requests = 0;
	nuxt.headers = { 'accept-language': 'en', cookie: '', 'sec-gpc': '1' };
	if (manifest) {
		nuxt.response = resolveManifestInit({
			headers: nuxt.headers,
			manifest: {
				branding: 'none',
				policyPacks: [createConsentManifestPolicyPack(rule)],
				revision: 'nuxt-ssr',
				schemaVersion: 2,
				translations: {
					i18n: {
						defaultProfile: 'default',
						messages: {
							default: {
								fallbackLanguage: 'en',
								translations: { en: nuxt.response.translations.translations },
							},
						},
					},
				},
			},
		});
	}
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			runWithContext: <Result>(run: () => Result) => Result;
			payload: { prerenderedAt?: number; serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	let context!: VueConsentKernelContext;
	const Probe = defineComponent({
		setup() {
			context = useConsentKernelContext();
			return () =>
				h('div', [
					h(
						'output',
						{ 'data-testid': 'nuxt-state' },
						JSON.stringify({
							gpc: context.snapshot.value.privacySignals.gpc.detected,
							now: context.snapshot.value.evaluatedAt,
							prompt: context.snapshot.value.promptRequirement,
						})
					),
					h(ConsentBanner),
				]);
		},
	});
	const serverApp = createSSRApp(Probe);
	vi.stubGlobal('window', undefined);
	vi.stubGlobal('document', undefined);
	await plugin({
		hook: () => {
			throw new Error('Server must not start browser lifecycle');
		},
		payload: {},
		runWithContext: (run) => run(),
		vueApp: serverApp,
	});
	const html = await renderToString(serverApp);
	const serverContext = context;
	const expected = serverContext.snapshot.value;
	expect(expected.privacySignals.gpc).toMatchObject({
		active: true,
		detected: true,
		override: undefined,
	});
	const payload = JSON.stringify(
		[...nuxt.state].map(([key, value]) => [key, value.value])
	);
	serverContext.dispose();
	vi.unstubAllGlobals();
	date.mockReturnValue(now + 10_000);
	nuxt.state = new Map(
		(JSON.parse(payload) as [string, unknown][]).map(([key, value]) => [
			key,
			ref(value),
		])
	);
	nuxt.headers = {};
	const writes = vi.spyOn(Storage.prototype, 'setItem');
	const beforeCookie = document.cookie;
	const warnings: string[] = [];
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	const consoleWarnings = vi
		.spyOn(console, 'warn')
		.mockImplementation(() => {});
	let mounted: (() => void) | undefined;
	const clientApp = createSSRApp(Probe);
	clientApp.config.warnHandler = (message) => warnings.push(message);
	await plugin({
		hook: (_name, lifecycle) => {
			mounted = lifecycle;
		},
		payload: { serverRendered: true },
		runWithContext: (run) => run(),
		vueApp: clientApp,
	});
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.append(container);
	onTestFinished(() => container.remove());
	const { root, card, marker } = expectCompleteBanner(container);
	expect(card?.textContent).toContain('Privacy notice');
	clientApp.mount(container);
	await nextTick();
	try {
		expect(context.snapshot.value.privacySignals.gpc).toMatchObject({
			active: true,
			detected: true,
			override: undefined,
		});
		expect(context.snapshot.value.evaluatedAt).toBe(now);
		expect(context.snapshot.value.promptRequirement).toEqual(
			expected.promptRequirement
		);
		expect(container.querySelector('output')?.textContent).toBe(
			JSON.stringify({ gpc: true, now, prompt: expected.promptRequirement })
		);
		const hydrated = expectCompleteBanner(document);
		expect(hydrated.root).toBe(root);
		expect(hydrated.marker).toBe(marker);
		const notice = hydrated.card;
		expect(notice).toBe(card);
		expect(notice?.getAttribute('role')).toBe('region');
		expect(notice?.getAttribute('aria-modal')).toBeNull();
		expect(document.body.style.overflow).not.toBe('hidden');
		expect(warnings).toEqual([]);
		expect(consoleWarnings).not.toHaveBeenCalled();
		expect(errors).not.toHaveBeenCalled();
		expect(writes).not.toHaveBeenCalled();
		expect(document.cookie).toBe(beforeCookie);
		mounted?.();
		await nextTick();
		expect(localStorage.getItem('c15t-privacy')).toBeNull();
		expect(context.snapshot.value.explicitChoice).toBeNull();
		expect(nuxt.requests).toBe(1);
		expect(context.snapshot.value.privacySignals.gpc).toMatchObject({
			active: true,
			detected: true,
			override: undefined,
		});
		context.kernel.set.overrides({ gpc: false });
		expect(context.snapshot.value.privacySignals.gpc).toMatchObject({
			active: false,
			detected: true,
			override: false,
		});
	} finally {
		clientApp.unmount();
	}
});

test('Nuxt external authority skips server fetch and records, then connects only on mount', async () => {
	const getPermissions = vi.fn(() => ({ measurement: true }));
	const detach = vi.fn();
	const openPreferences = vi.fn();
	nuxt.requests = 0;
	nuxt.consentSource = {
		getPermissions,
		openPreferences,
		subscribe: () => detach,
	};
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			runWithContext: <Result>(run: () => Result) => Result;
			payload: { prerenderedAt?: number; serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	let context!: VueConsentKernelContext;
	const app = createApp(
		defineComponent({
			setup() {
				context = useConsentKernelContext();
				return () => h('div');
			},
		})
	);
	let mounted: (() => void) | undefined;
	await plugin({
		hook: (name, handler) => {
			if (name === 'app:mounted') {
				mounted = handler;
			}
		},
		payload: { serverRendered: true },
		runWithContext: (run) => run(),
		vueApp: app,
	});
	expect(nuxt.requests).toBe(0);
	expect(nuxt.state.get('c15t:records')?.value).toBeUndefined();
	expect(getPermissions).not.toHaveBeenCalled();
	const container = document.createElement('div');
	document.body.append(container);
	app.mount(container);
	try {
		expect(context.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			false
		);
		mounted?.();
		// The source connects once its module has loaded.
		await vi.waitFor(() =>
			expect(
				context.kernel.getSnapshot().effectivePermissions.measurement
			).toBe(true)
		);
		context.activeUI.value = 'manager';
		expect(openPreferences).toHaveBeenCalledTimes(1);
		expect(context.kernel.getSnapshot().activeUI).toBe('none');
	} finally {
		app.unmount();
	}
	expect(detach).toHaveBeenCalledTimes(1);
});

test('the server init fetch carries a fixed experiment arm until the visitor chooses', async () => {
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			runWithContext: <Result>(run: () => Result) => Result;
			payload: { prerenderedAt?: number; serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	const policy = normalizePolicyRule({
		categories: ['marketing'],
		id: 'nuxt-experiment',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	});
	nuxt.manifest = false;
	nuxt.response = {
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
	nuxt.experiment = {
		arm: 'wall',
		arms: { wall: { prompt: { variant: 'wall' } } },
		id: 'banner-shape',
	};
	nuxt.headers = { cookie: '' };
	vi.stubGlobal('window', undefined);
	vi.stubGlobal('document', undefined);
	await plugin({
		hook: () => undefined,
		payload: {},
		runWithContext: (run) => run(),
		vueApp: createSSRApp(defineComponent({ render: () => null })),
	});
	expect(nuxt.fetchHeaders[0]?.['x-c15t-experiment']).toBe('banner-shape=wall');
});

test('an `ssr: false` route asks for the policy before the app mounts', async () => {
	nuxt.manifest = false;
	nuxt.headers = {};
	const policy = normalizePolicyRule({
		categories: ['marketing'],
		id: 'nuxt-client',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	});
	const response: InitOutput = {
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
	const requests: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn((input: RequestInfo | URL) => {
			// The path alone: the runtime adds its consent journey as a query.
			requests.push(String(input).split('?')[0] ?? '');
			return Promise.resolve(
				new Response(JSON.stringify(response), {
					headers: { [C15T_POLICY_CONTRACT_HEADER]: '1' },
				})
			);
		})
	);
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			runWithContext: <Result>(run: () => Result) => Result;
			payload: { serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	const app = createApp(defineComponent({ render: () => h(ConsentBanner) }));
	const hooks: string[] = [];
	// No server markup: the payload says the page was not server-rendered.
	await plugin({
		hook: (name) => hooks.push(name),
		payload: {},
		runWithContext: (run) => run(),
		vueApp: app,
	});
	// `/init` is on its way before the app mounts, and nothing waits for mount.
	await vi.waitFor(() =>
		expect(requests.some((url) => url.endsWith('/init'))).toBe(true)
	);
	expect(hooks).not.toContain('app:mounted');
	const container = document.createElement('div');
	document.body.append(container);
	app.mount(container);
	try {
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull()
		);
		expect(requests.filter((url) => url.endsWith('/init'))).toHaveLength(1);
	} finally {
		app.unmount();
	}
});

test('an `ssr: false` route that resolves in the browser starts once the app mounts', async () => {
	nuxt.manifest = 'client';
	nuxt.headers = {};
	const requests: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn((input: RequestInfo | URL) => {
			// The path alone: the runtime adds its consent journey as a query.
			requests.push(String(input).split('?')[0] ?? '');
			return Promise.resolve(new Response('{}', { status: 503 }));
		})
	);
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			runWithContext: <Result>(run: () => Result) => Result;
			payload: { serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	const app = createApp(defineComponent({ render: () => null }));
	const hooks: string[] = [];
	await plugin({
		hook: (name) => hooks.push(name),
		payload: {},
		runWithContext: (run) => run(),
		vueApp: app,
	});
	// The manifest request left when the runtime was built; starting before
	// the mount would only put work in front of it.
	await vi.waitFor(() =>
		expect(requests.some((url) => url.includes('/manifest'))).toBe(true)
	);
	expect(hooks).toContain('app:mounted');
});

test('the server render gives a new visitor a subject ID the browser starts with', async () => {
	const { default: plugin } = await vi.importActual<{
		default: (app: {
			vueApp: App;
			hook: (name: string, callback: () => void) => void;
			runWithContext: <Result>(run: () => Result) => Result;
			payload: { prerenderedAt?: number; serverRendered?: boolean };
		}) => Promise<void>;
	}>('../runtime/plugin.nuxt');
	nuxt.manifest = false;
	const policy = normalizePolicyRule({
		categories: ['marketing'],
		id: 'nuxt-subject',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	});
	nuxt.response = {
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
	let context!: VueConsentKernelContext;
	const Probe = defineComponent({
		setup() {
			context = useConsentKernelContext();
			return () => h('div', [h(ConsentBanner)]);
		},
	});
	const renderOnServer = async function renderOnServer(
		headers: Record<string, string>
	) {
		nuxt.state.clear();
		nuxt.cookies = [];
		nuxt.headers = headers;
		const app = createSSRApp(Probe);
		vi.stubGlobal('window', undefined);
		vi.stubGlobal('document', undefined);
		await plugin({
			hook: () => {
				throw new Error('Server must not start browser lifecycle');
			},
			payload: {},
			runWithContext: (run) => run(),
			vueApp: app,
		});
		const html = await renderToString(app);
		const subjectId = context.snapshot.value.subject?.subjectId;
		const { explicitChoice } = context.snapshot.value;
		context.dispose();
		vi.unstubAllGlobals();
		return { explicitChoice, html, subjectId };
	};

	const first = await renderOnServer({ cookie: 'theme=dark' });
	expect(first.subjectId).toMatch(/^sub_/u);
	expect(first.explicitChoice).toBeNull();
	expect(nuxt.cookies).toEqual([
		{
			name: 'c15t-sid',
			options: {
				encode: expect.any(Function),
				httpOnly: false,
				maxAge: 365 * 86_400,
				path: '/',
				sameSite: 'lax',
				secure: true,
			},
			value: first.subjectId,
		},
	]);

	// The response holds the raw ID, the same bytes the render's request had.
	const encode = nuxt.cookies[0]?.options.encode as (value: string) => string;
	expect(encode(first.subjectId as string)).toBe(first.subjectId);

	// The browser now holds the cookie the response set.
	const payload = JSON.stringify(
		[...nuxt.state].map(([key, value]) => [key, value.value])
	);
	nuxt.state = new Map(
		(JSON.parse(payload) as [string, unknown][]).map(([key, value]) => [
			key,
			ref(value),
		])
	);
	nuxt.headers = {};
	document.cookie = `c15t-sid=${first.subjectId}; path=/`;
	const clientApp = createSSRApp(Probe);
	await plugin({
		hook: () => undefined,
		payload: { serverRendered: true },
		runWithContext: (run) => run(),
		vueApp: clientApp,
	});
	const container = document.createElement('div');
	container.innerHTML = first.html;
	document.body.append(container);
	clientApp.mount(container);
	await nextTick();
	try {
		expect(context.snapshot.value.subject?.subjectId).toBe(first.subjectId);
		expect(context.snapshot.value.explicitChoice).toBeNull();
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull();
	} finally {
		clientApp.unmount();
		document.cookie = 'c15t-sid=; path=/; max-age=0';
	}

	const returning = await renderOnServer({
		cookie: `c15t-sid=${first.subjectId}`,
	});
	expect(returning.subjectId).toBe(first.subjectId);
	expect(nuxt.cookies).toEqual([]);

	const prefetch = await renderOnServer({
		cookie: '',
		'sec-purpose': 'prefetch',
	});
	expect(prefetch.subjectId).toBeUndefined();
	expect(nuxt.cookies).toEqual([]);
});
