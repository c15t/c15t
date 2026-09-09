import { C15T_POLICY_CONTRACT_HEADER } from '@c15t/core';
import { readStoredRecords } from '@c15t/core/modules/persistence';
import {
	normalizePolicyRule,
	createConsentManifestPolicyPack,
	createPolicyRuleFingerprints,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput, PolicyRule } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, expect, test, vi } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick, shallowRef } from 'vue';
import type { App, ShallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';

import ConsentBanner from '../runtime/components/consent-banner.vue';
import { useConsentKernelContext } from '../runtime/composables/kernel';
import type { VueConsentKernelContext } from '../runtime/kernel';
import { resolveManifestInit } from '../runtime/server/manifest-mode';

const nuxt = vi.hoisted(() => ({
	cached: undefined as InitOutput | undefined,
	headers: {} as Record<string, string | undefined>,
	manifest: false,
	requests: 0,
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
				backendURL: '/api/c15t',
				disableAnimation: true,
				hideBranding: true,
				iframeBlocker: false,
				manifest: nuxt.manifest,
			},
		}),
		useFetch: (
			_url: string,
			options: {
				headers: Record<string, string>;
				onResponse: (context: { response: { headers: Headers } }) => void;
			}
		) => {
			if (!nuxt.cached) {
				expect(options.headers[C15T_POLICY_CONTRACT_HEADER]).toBe('1');
				options.onResponse({
					response: {
						headers: new Headers({ [C15T_POLICY_CONTRACT_HEADER]: '1' }),
					},
				});
				nuxt.requests += 1;
				nuxt.cached = nuxt.response;
			}
			return Promise.resolve({ data: makeRef(nuxt.cached) });
		},
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

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	nuxt.state.clear();
	nuxt.cached = undefined;
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
	};
	const policy = normalizePolicyRule(rule);
	nuxt.response = {
		branding: 'none',
		jurisdiction: 'GDPR',
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
			shallowRef(value),
		])
	);
	nuxt.headers = {};
	const writes = vi.spyOn(Storage.prototype, 'setItem');
	const beforeCookie = document.cookie;
	const warnings: string[] = [];
	let mounted: (() => void) | undefined;
	const clientApp = createSSRApp(Probe);
	clientApp.config.warnHandler = (message) => warnings.push(message);
	await plugin({
		hook: (_name, lifecycle) => {
			mounted = lifecycle;
		},
		vueApp: clientApp,
	});
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.append(container);
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
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull();
		const notice = document.querySelector(
			'[data-testid="consent-banner-card"]'
		);
		expect(notice?.getAttribute('role')).toBe('region');
		expect(notice?.getAttribute('aria-modal')).toBeNull();
		expect(document.body.style.overflow).not.toBe('hidden');
		expect(warnings).toEqual([]);
		expect(writes).not.toHaveBeenCalled();
		expect(document.cookie).toBe(beforeCookie);
		mounted?.();
		await nextTick();
		await vi.waitFor(() =>
			expect(
				readStoredRecords(undefined, now + 10_000).records.optOutDirectives
			).toHaveLength(1)
		);
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
