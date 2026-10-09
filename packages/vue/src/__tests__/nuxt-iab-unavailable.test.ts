/**
 * An `iab` policy in a Nuxt app without `iab`.
 *
 * No CMP answers for the policy and the standard banner does not handle
 * it, so the visitor would get no working consent UI. The plugin throws an
 * `IABUnavailableError` from the server render, which Nuxt turns into its
 * error page, and shows the same error page when the browser resolves the
 * policy itself.
 */
import {
	C15T_POLICY_CONTRACT_HEADER,
	IAB_UNAVAILABLE_ERROR_CODE,
} from '@c15t/core';
import type { InitOutput } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, expect, test, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import type { App, ShallowRef } from 'vue';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';

const NUXT_MESSAGE =
	"c15t: this visitor's policy uses IAB TCF, but `iab` is not set. Set `c15t: { iab: {} }` in nuxt.config.ts, or `iab: { cmpId }` when your backend sends no CMP ID, or remove the IAB model from your policy.";

const nuxt = vi.hoisted(() => ({
	iab: undefined as object | undefined,
	showError: vi.fn(),
	state: new Map<string, ShallowRef<unknown>>(),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test needs its error page and request state.
vi.mock('#imports', async () => {
	const { shallowRef: makeRef } = await import('vue');
	return {
		defineNuxtPlugin: (plugin: unknown) => plugin,
		showError: nuxt.showError,
		useAppConfig: () => ({
			c15t: {
				backendURL: 'https://consent.example',
				consentCategories: ['necessary', 'measurement', 'marketing'],
				iab: nuxt.iab,
				iframeBlocker: false,
			},
		}),
		useHead: () => undefined,
		useRequestEvent: () => ({ context: {} }),
		useRequestHeaders: () => ({ 'x-vercel-ip-country': 'DE' }),
		useRequestURL: () => new URL('https://app.example/'),
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
	payload: { serverRendered?: boolean };
	runWithContext: <Result>(run: () => Result) => Result;
	vueApp: App;
}) => Promise<void>;

const iabInit = {
	branding: 'c15t',
	cmpId: 28,
	gvl: completeGVL,
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					id: 'iab',
					match: { isDefault: true },
					model: 'iab',
					prompt: 'choice',
				},
			],
		})
	),
	translations: { language: 'en', translations },
} as unknown as InitOutput;

const stubBackend = () =>
	vi.stubGlobal(
		'fetch',
		vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(iabInit), {
					headers: {
						'content-type': 'application/json',
						[C15T_POLICY_CONTRACT_HEADER]: '1',
					},
				})
			)
		)
	);

const loadPlugin = async (): Promise<NuxtPlugin> =>
	(await vi.importActual<{ default: NuxtPlugin }>('../runtime/plugin.nuxt'))
		.default;

const runPlugin = async (payload: { serverRendered?: boolean }) =>
	(await loadPlugin())({
		hook: () => undefined,
		payload,
		runWithContext: (run) => run(),
		vueApp: createSSRApp({ render: () => h('div') }),
	});

afterEach(() => {
	vi.unstubAllGlobals();
	nuxt.iab = undefined;
	nuxt.showError.mockReset();
	nuxt.state.clear();
});

test('the server render throws, so Nuxt renders its error page', async () => {
	stubBackend();
	vi.stubGlobal('window', undefined);
	vi.stubGlobal('document', undefined);

	let failure: unknown;
	try {
		await runPlugin({});
	} catch (error) {
		failure = error;
	}

	expect((failure as Error | undefined)?.message).toBe(NUXT_MESSAGE);
	expect((failure as { code?: string }).code).toBe(IAB_UNAVAILABLE_ERROR_CODE);
});

test('the server render with `iab: {}` does not throw', async () => {
	nuxt.iab = {};
	stubBackend();
	vi.stubGlobal('window', undefined);
	vi.stubGlobal('document', undefined);

	await expect(runPlugin({})).resolves.toBeUndefined();
});

test('a page the browser resolves shows the error page', async () => {
	stubBackend();

	// `ssr: false`: no server state, so the browser asks `/init` itself.
	const consoleError = vi
		.spyOn(console, 'error')
		.mockImplementation(() => undefined);
	await runPlugin({ serverRendered: false });

	await vi.waitFor(() => expect(nuxt.showError).toHaveBeenCalledTimes(1));
	const [error] = nuxt.showError.mock.calls[0] ?? [];
	expect((error as Error).message).toBe(NUXT_MESSAGE);
	expect((error as { code?: string }).code).toBe(IAB_UNAVAILABLE_ERROR_CODE);
	expect(consoleError).toHaveBeenCalledWith(error);
	consoleError.mockRestore();
});
