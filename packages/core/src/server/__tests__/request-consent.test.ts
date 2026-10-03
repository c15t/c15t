/**
 * Contract suite for the server-side consent resolution every adapter uses.
 *
 * Next.js, TanStack Start, SvelteKit, Astro and Nuxt each used to resolve a
 * request's consent state with their own copy of this logic, and the copies
 * drifted: how GPC was read, what was forwarded to the backend, whether the
 * render could fetch its own routes, how the budget treated bad values, and
 * whether a shared render carried one visitor's state. Each test pins one
 * rule for all of them; the adapters only test their wiring.
 */
import type {
	ConsentManifest,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import {
	createConsentManifestPolicyPack,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { clearManifestCache } from '../../libs/manifest-cache-runtime';
import type { ManifestFetch } from '../../libs/manifest-cache-runtime';
import { CONSENT_ROUTE_TIMEOUT_HEADER } from '../consent-route';
import { clearGvlCache } from '../gvl-cache';
import { readRequestConsent, resolveRequestConsent } from '../request-consent';
import type { ResolveRequestConsentOptions } from '../request-consent';

const BACKEND = 'https://consent.example.com';
const APP = 'https://app.example.com';
const GVL_URL = 'https://gvl.example/vendor-list.json';
const NOW = 1_780_000_000_000;
const CONSENTED = `c15t=c.necessary:1,c.marketing:1,i.t:${NOW - 1000}`;

const MANIFEST = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: ['measurement', 'marketing'],
			id: 'eu-opt-in',
			match: { countries: ['DE'] },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
			validity: { choiceDays: 365 },
		}),
		createConsentManifestPolicyPack({
			categories: [],
			id: 'notice-default',
			match: { isDefault: true },
			model: 'opt-out',
			prompt: 'none',
			scopeMode: 'permissive',
			validity: { choiceDays: 30 },
		}),
	],
	revision: 'manifest-revision',
	schemaVersion: 2,
} as unknown as ConsentManifest;

const IAB_MANIFEST = {
	...MANIFEST,
	cmpId: 28,
	iab: { enabled: true, gvl: { url: GVL_URL } },
	policyPacks: [
		createConsentManifestPolicyPack({
			id: 'iab',
			match: { fallback: true },
			model: 'iab',
			prompt: 'choice',
		}),
	],
} as unknown as ConsentManifest;

const GVL = {
	purposes: { '1': { id: 1, name: 'Store and/or access information' } },
	vendorListVersion: 42,
	vendors: { '1': { id: 1, name: 'Vendor', purposes: [1] } },
} as unknown as GlobalVendorList;

const INIT: InitOutput = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					categories: ['measurement'],
					id: 'policy_gdpr',
					match: { isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'strict',
				},
			],
		})
	),
	translations: { language: 'de', translations: {} },
} as unknown as InitOutput;

const json = function json(
	body: unknown,
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(body), {
		headers: {
			'content-type': 'application/json',
			'x-c15t-policy-contract': '1',
			...headers,
		},
	});
};

type FetchMock = ReturnType<typeof vi.fn<typeof globalThis.fetch>>;

/** Serves `/init`, the manifest, the vendor list and session reports. */
const upstream = function upstream(
	manifest: ConsentManifest = MANIFEST,
	init: unknown = INIT
): FetchMock {
	return vi.fn<typeof globalThis.fetch>((input) => {
		const url = String(input instanceof Request ? input.url : input);
		if (url.startsWith(GVL_URL)) {
			return Promise.resolve(json(GVL));
		}
		if (url.endsWith('/sessions')) {
			return Promise.resolve(new Response(null, { status: 202 }));
		}
		if (url.includes('/init')) {
			return Promise.resolve(
				json(typeof init === 'function' ? (init as () => unknown)() : init)
			);
		}
		return Promise.resolve(
			json(manifest, { 'cache-control': 'public, s-maxage=120' })
		);
	});
};

const callsTo = (fetch: FetchMock, fragment: string) =>
	fetch.mock.calls.filter(([input]) => String(input).includes(fragment));

const sentHeaders = (fetch: FetchMock, fragment: string): Headers =>
	new Headers(callsTo(fetch, fragment)[0]?.[1]?.headers);

const render = (
	options: Partial<ResolveRequestConsentOptions> & {
		headers?: Record<string, string>;
	} = {}
) => {
	const { headers, ...rest } = options;
	return resolveRequestConsent({
		adapter: '@c15t/test',
		now: NOW,
		request: { headers: new Headers(headers), url: `${APP}/` },
		...rest,
	});
};

beforeEach(() => {
	clearManifestCache();
	clearGvlCache();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('request read', () => {
	test('reads stored records from the consent cookie under the storage key', () => {
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: NOW,
			request: {
				headers: new Headers({
					cookie: `other=1; ${CONSENTED.replace('c15t=', 'custom=')}`,
				}),
			},
			storage: { storageKey: 'custom' },
		});
		expect(state.initialRecords?.choice).toBeDefined();
		expect(state.now).toBe(NOW);
	});

	test('a cookie the framework read apart from the headers wins', () => {
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: NOW,
			request: { cookie: CONSENTED, headers: new Headers() },
		});
		expect(state.initialRecords?.choice).toBeDefined();
	});

	test('GPC comes from the shared extractor: x-c15t-gpc first, absent stays undefined', () => {
		const read = (headers: Record<string, string>) =>
			readRequestConsent({
				adapter: '@c15t/test',
				request: { headers: new Headers(headers) },
			}).state.initialPrivacySignals;
		expect(read({ 'sec-gpc': '1' })).toEqual({ gpc: true });
		expect(read({ 'sec-gpc': '1', 'x-c15t-gpc': '0' })).toEqual({
			gpc: false,
		});
		// SvelteKit used to read raw `sec-gpc` and turn an absent signal into
		// `false`, which a browser runtime then treated as a decision.
		expect(read({})).toEqual({ gpc: undefined });
	});

	test('explicit overrides beat the headers and a middleware read', () => {
		const fromHeaders = readRequestConsent({
			adapter: '@c15t/test',
			overrides: { country: 'FR' },
			request: {
				headers: new Headers({
					'accept-language': 'de-DE',
					'cf-ipcountry': 'DE',
				}),
			},
		});
		expect(fromHeaders.state.initialOverrides).toEqual({
			country: 'FR',
			language: 'de',
		});
		const fromMiddleware = readRequestConsent({
			adapter: '@c15t/test',
			overrides: { language: 'fr' },
			request: {
				headers: new Headers({ 'cf-ipcountry': 'US' }),
				inputs: { country: 'DE', language: 'de', region: 'BE' },
			},
		});
		expect(fromMiddleware.inputs).toEqual({
			country: 'DE',
			language: 'fr',
			region: 'BE',
		});
	});

	test('without a mode it returns the request-only state and fetches nothing', async () => {
		const fetch = upstream();
		const state = await render({ fetch, headers: { cookie: CONSENTED } });
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution).toBeUndefined();
		expect(state.initialRecords?.choice).toBeDefined();
	});
});

describe('target resolution', () => {
	test('a relative backend resolves against the request URL, never a forged forwarded host', async () => {
		const fetch = upstream();
		await render({
			backendURL: '/consent',
			fetch,
			headers: { 'x-forwarded-host': 'evil.example' },
		});
		expect(String(fetch.mock.calls[0]?.[0])).toBe(`${APP}/consent/init`);
	});

	test('forwarded headers decide the origin only when trusted', async () => {
		const fetch = upstream();
		await render({
			backendURL: '/consent',
			fetch,
			headers: { 'x-forwarded-host': 'edge.example' },
			trustForwardedHeaders: true,
		});
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://edge.example/consent/init'
		);
	});

	test('an unresolvable URL returns the request-only state and reports why', async () => {
		const fetch = upstream();
		const onError = vi.fn();
		const state = await resolveRequestConsent({
			adapter: '@c15t/test',
			backendURL: '/consent',
			fetch,
			onError,
			request: { headers: new Headers() },
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution).toBeUndefined();
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0]?.[1]).toBe('/consent/init');
	});

	describe('self-route guard', () => {
		test.each([
			['hosted', { backendURL: '/api/c15t' }],
			['manifest', { manifestURL: '/api/c15t/manifest' }],
			['an absolute same-origin URL', { backendURL: `${APP}/api/c15t` }],
		])('never fetches the app’s own consent route (%s)', async (_, source) => {
			const fetch = upstream();
			const onError = vi.fn();
			const state = await render({ fetch, onError, ...source });
			expect(fetch).not.toHaveBeenCalled();
			expect(state.initialPolicyResolution).toBeUndefined();
			expect(String(onError.mock.calls[0]?.[0])).toContain('own consent route');
		});

		test('honours the routes the adapter declares, segment by segment', async () => {
			const fetch = upstream();
			await render({
				backendURL: '/api/consent',
				fetch,
				ownRoutes: ['/api/consent'],
			});
			expect(fetch).not.toHaveBeenCalled();
			await render({
				backendURL: '/api/consentx',
				fetch,
				ownRoutes: ['/api/consent'],
			});
			expect(String(fetch.mock.calls[0]?.[0])).toBe(`${APP}/api/consentx/init`);
		});

		test('a same-origin backend outside the consent routes is fetched', async () => {
			const fetch = upstream();
			await render({ backendURL: '/api/self-host', fetch });
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		test('an adapter with no own routes fetches a same-origin /api/c15t backend', async () => {
			const fetch = upstream();
			const state = await render({
				backendURL: '/api/c15t',
				fetch,
				ownRoutes: [],
			});
			expect(String(fetch.mock.calls[0]?.[0])).toBe(`${APP}/api/c15t/init`);
			expect(state.initialPolicyResolution?.status).toBe('matched');
		});

		test('a render reached by its own origin’s render request stops there', async () => {
			const fetch = upstream();
			await render({ backendURL: '/api/self-host', fetch });
			const marked = Object.fromEntries(sentHeaders(fetch, '/init'));
			// A page answered that request (an unmounted backend prefix) and its
			// render resolves again with the headers it received.
			const onError = vi.fn();
			const nested = await render({
				backendURL: '/api/self-host',
				fetch,
				headers: marked,
				onError,
			});
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(nested.initialPolicyResolution).toBeUndefined();
			expect(onError.mock.calls[0]?.[1]).toBe(`${APP}/api/self-host/init`);
			// A backend on another origin is still asked.
			await render({ backendURL: BACKEND, fetch, headers: marked });
			expect(callsTo(fetch, BACKEND)).toHaveLength(1);
		});

		test('only same-origin requests carry the render marker', async () => {
			const fetch = upstream();
			await render({ backendURL: BACKEND, fetch });
			await render({ backendURL: '/api/self-host', fetch });
			const remote = new Headers(fetch.mock.calls[0]?.[1]?.headers);
			const own = new Headers(fetch.mock.calls[1]?.[1]?.headers);
			const added = [...own.keys()].filter((name) => !remote.has(name));
			expect(added).toHaveLength(1);
		});

		test('an in-process fetch reaches the own init route with the budget header', async () => {
			const fetch = upstream();
			const localFetch = vi.fn<ManifestFetch>(() =>
				Promise.resolve(json(INIT))
			);
			const state = await render({
				fetch,
				headers: { cookie: CONSENTED },
				initURL: '/api/c15t/init',
				localFetch,
			});
			expect(fetch).not.toHaveBeenCalled();
			expect(localFetch.mock.calls[0]?.[0]).toBe('/api/c15t/init');
			const headers = new Headers(localFetch.mock.calls[0]?.[1]?.headers);
			expect(headers.get(CONSENT_ROUTE_TIMEOUT_HEADER)).toMatch(/^\d+$/u);
			// The app's own route reads no cookie, so none is sent.
			expect(headers.has('cookie')).toBe(false);
			expect(state.initialPolicyResolution?.status).toBe('matched');
		});

		test('an absolute URL on the request origin also goes in-process', async () => {
			const fetch = upstream();
			const localFetch = vi.fn<ManifestFetch>(() =>
				Promise.resolve(json(INIT))
			);
			await render({
				backendURL: `${APP}/api/bench-consent`,
				fetch,
				localFetch,
			});
			expect(fetch).not.toHaveBeenCalled();
			expect(localFetch.mock.calls[0]?.[0]).toBe('/api/bench-consent/init');
		});
	});
});

describe('modes', () => {
	test('manifest mode resolves locally and reads the manifest once across renders', async () => {
		const fetch = upstream();
		const first = await render({
			backendURL: BACKEND,
			fetch,
			headers: { 'cf-ipcountry': 'DE' },
			mode: 'manifest',
			reportSessions: false,
		});
		const second = await render({
			backendURL: BACKEND,
			fetch,
			headers: { 'cf-ipcountry': 'US' },
			mode: 'manifest',
			reportSessions: false,
		});
		expect(callsTo(fetch, '/manifest')).toHaveLength(1);
		expect(callsTo(fetch, '/init')).toHaveLength(0);
		expect(first.initialPolicyResolution?.status).toBe('matched');
		expect(
			first.initialPolicyResolution?.status === 'matched' &&
				first.initialPolicyResolution.policyId
		).toContain('eu-opt-in');
		expect(
			second.initialPolicyResolution?.status === 'matched' &&
				second.initialPolicyResolution.policyId
		).toContain('notice-default');
	});

	test('an inline manifest needs no network', async () => {
		const fetch = upstream();
		const state = await render({ fetch, manifest: MANIFEST });
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});

	test('hosted mode folds the backend /init into the request-only state', async () => {
		const fetch = upstream(MANIFEST, { ...INIT, subjectId: 'sub_1' });
		const state = await render({
			backendURL: BACKEND,
			fetch,
			headers: { cookie: CONSENTED },
		});
		expect(state.initialPolicyResolution?.status).toBe('matched');
		expect(state.initialRecords?.choice).toBeDefined();
		expect(state.initialRecords?.subject?.subjectId).toBe('sub_1');
		expect(state.initialLocation?.countryCode).toBe('DE');
	});

	test('a hosted producer that declares no contract and sends no wire fails closed', async () => {
		const legacy = { ...INIT, policyResolution: undefined };
		const fetch = vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(new Response(JSON.stringify(legacy)))
		);
		const state = await render({ backendURL: BACKEND, fetch });
		expect(state.initialPolicyResolution?.status).toBe('failed');
	});

	test('offline mode resolves bundled rules without the network', async () => {
		const fetch = upstream();
		vi.stubGlobal('fetch', fetch);
		const state = await render({
			headers: { 'cf-ipcountry': 'DE' },
			offline: {},
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});
});

describe('forwarding', () => {
	const visitor = {
		'accept-language': 'de-DE,de;q=0.9',
		authorization: 'Bearer site-session',
		cookie: `session=secret; ${CONSENTED}`,
		'sec-gpc': '1',
		'user-agent': 'Visitor/1.0',
		'x-forwarded-for': '203.0.113.7',
		'x-forwarded-host': 'evil.example',
		'x-tenant': 'acme',
		'x-vercel-ip-country': 'DE',
		'x-vercel-ip-country-region': 'BE',
	};

	test('hosted /init gets the consent cookie, inputs and user agent, never the jar', async () => {
		const fetch = upstream();
		await render({ backendURL: BACKEND, fetch, headers: visitor });
		const headers = sentHeaders(fetch, '/init');
		expect(Object.fromEntries(headers)).toMatchObject({
			'accept-language': 'de',
			cookie: CONSENTED,
			'sec-gpc': '1',
			'user-agent': 'Visitor/1.0',
			'x-c15t-country': 'DE',
			'x-c15t-policy-contract': '1',
			'x-c15t-region': 'BE',
		});
		expect(headers.has('authorization')).toBe(false);
		expect(headers.has('x-forwarded-for')).toBe(false);
		expect(headers.has('x-forwarded-host')).toBe(false);
		expect(headers.has('x-tenant')).toBe(false);
	});

	test('named headers travel; cookies and hop-chain headers cannot be named', async () => {
		const fetch = upstream();
		await render({
			backendURL: BACKEND,
			fetch,
			forwardHeaders: ['X-Tenant', 'cookie', 'x-forwarded-host'],
			headers: visitor,
		});
		const headers = sentHeaders(fetch, '/init');
		expect(headers.get('x-tenant')).toBe('acme');
		expect(headers.get('cookie')).toBe(CONSENTED);
		expect(headers.has('x-forwarded-host')).toBe(false);
	});

	test('the visitor IP travels only under trusted forwarding headers', async () => {
		const fetch = upstream();
		await render({
			backendURL: BACKEND,
			fetch,
			headers: visitor,
			trustForwardedHeaders: true,
		});
		expect(sentHeaders(fetch, '/init').get('x-forwarded-for')).toBe(
			'203.0.113.7'
		);
	});

	test('nothing identifying crosses cleartext to a remote host', async () => {
		const fetch = upstream();
		await render({
			backendURL: 'http://consent.internal',
			fetch,
			forwardHeaders: ['x-tenant'],
			headers: visitor,
			trustForwardedHeaders: true,
		});
		const headers = sentHeaders(fetch, '/init');
		expect(headers.has('cookie')).toBe(false);
		expect(headers.has('x-tenant')).toBe(false);
		expect(headers.has('x-forwarded-for')).toBe(false);
		expect(headers.get('x-c15t-country')).toBe('DE');
	});

	test('a loopback backend counts as local', async () => {
		const fetch = upstream();
		await render({
			backendURL: 'http://localhost:8787',
			fetch,
			headers: visitor,
		});
		expect(sentHeaders(fetch, '/init').get('cookie')).toBe(CONSENTED);
	});

	test('the manifest request carries nothing about the visitor by default', async () => {
		const fetch = upstream();
		await render({
			backendURL: BACKEND,
			fetch,
			headers: visitor,
			mode: 'manifest',
			reportSessions: false,
		});
		const headers = sentHeaders(fetch, '/manifest');
		expect(headers.has('cookie')).toBe(false);
		expect(headers.has('user-agent')).toBe(false);
		expect(headers.has('authorization')).toBe(false);
	});

	test('the manifest request carries named headers and scoped cookies, not over cleartext', async () => {
		const fetch = upstream();
		await render({
			backendURL: BACKEND,
			cookieNames: ['session'],
			fetch,
			forwardHeaders: ['x-tenant'],
			headers: visitor,
			mode: 'manifest',
			reportSessions: false,
		});
		const headers = sentHeaders(fetch, '/manifest');
		expect(headers.get('cookie')).toBe('session=secret');
		expect(headers.get('x-tenant')).toBe('acme');

		const cleartext = upstream();
		await render({
			backendURL: 'http://consent.internal',
			cookieNames: ['session'],
			fetch: cleartext,
			forwardHeaders: ['x-tenant'],
			headers: visitor,
			mode: 'manifest',
			reportSessions: false,
		});
		const plain = sentHeaders(cleartext, '/manifest');
		expect(plain.has('cookie')).toBe(false);
		expect(plain.has('x-tenant')).toBe(false);
	});

	test('configured consent headers reach the hosted /init; others do not', async () => {
		const fetch = upstream();
		await render({
			backendURL: BACKEND,
			fetch,
			initHeaders: { 'X-C15T-Country': 'FR', 'x-private': 'no' },
		});
		const headers = sentHeaders(fetch, '/init');
		expect(headers.get('x-c15t-country')).toBe('FR');
		expect(headers.has('x-private')).toBe(false);
	});
});

describe('vendor list deferral', () => {
	test('manifest mode defers the list to the public URL, or the gvl route', async () => {
		vi.stubGlobal('fetch', upstream(IAB_MANIFEST));
		const toList = await render({
			backendURL: BACKEND,
			mode: 'manifest',
			reportSessions: false,
		});
		expect(toList.initialIab?.gvl).toBeNull();
		expect(toList.initialIab?.gvlReference?.url).toBe(GVL_URL);

		const toRoute = await render({
			backendURL: BACKEND,
			gvlRoute: '/api/c15t/init',
			mode: 'manifest',
			reportSessions: false,
		});
		expect(toRoute.initialIab?.gvlReference?.url).toMatch(
			/^\/api\/c15t\/init\?c15t-gvl=42/u
		);
	});

	test('a caller fetch keeps the list inline', async () => {
		const state = await render({
			backendURL: BACKEND,
			fetch: upstream(IAB_MANIFEST),
			mode: 'manifest',
			reportSessions: false,
		});
		expect(state.initialIab?.gvl?.vendorListVersion).toBe(42);
	});

	test('hosted mode defers to the same /init unless the call carried a cookie', async () => {
		const iabInit = {
			...INIT,
			cmpId: 28,
			gvl: GVL,
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
		};
		vi.stubGlobal('fetch', upstream(MANIFEST, iabInit));
		const anonymous = await render({ backendURL: BACKEND });
		expect(anonymous.initialIab?.gvlReference?.url).toBe(`${BACKEND}/init`);
		const returning = await render({
			backendURL: BACKEND,
			headers: { cookie: CONSENTED },
		});
		expect(returning.initialIab?.gvl?.vendorListVersion).toBe(42);
	});
});

describe('budget', () => {
	const hanging = () =>
		vi.fn<typeof globalThis.fetch>(
			(_, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new Error('aborted'))
					);
				})
		);

	test.each([
		['the default', undefined],
		['NaN', Number.NaN],
		['a negative value', -5],
	])('%s budget is 500 ms', async (_, timeoutMs) => {
		vi.useFakeTimers();
		const fetch = hanging();
		const pending = render({ backendURL: BACKEND, fetch, timeoutMs });
		await vi.advanceTimersByTimeAsync(499);
		let settled = false;
		void pending.then(() => {
			settled = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		const state = await pending;
		expect(state.initialPolicyResolution).toBeUndefined();
	});

	test.each([
		['false', false as const],
		['Infinity', Number.POSITIVE_INFINITY],
	])('timeoutMs %s waits for the upstream', async (_, timeoutMs) => {
		vi.useFakeTimers();
		const fetch = vi.fn<typeof globalThis.fetch>(
			() =>
				new Promise<Response>((resolve) => {
					setTimeout(() => resolve(json(INIT)), 2000);
				})
		);
		const pending = render({ backendURL: BACKEND, fetch, timeoutMs });
		await vi.advanceTimersByTimeAsync(2000);
		expect((await pending).initialPolicyResolution?.status).toBe('matched');
	});

	test('a manifest that misses the budget keeps filling and serves the next render', async () => {
		vi.useFakeTimers();
		const waitUntil = vi.fn();
		const fetch = vi.fn<typeof globalThis.fetch>(
			() =>
				new Promise<Response>((resolve) => {
					setTimeout(
						() =>
							resolve(
								json(MANIFEST, { 'cache-control': 'public, s-maxage=120' })
							),
						800
					);
				})
		);
		const options = {
			backendURL: BACKEND,
			fetch,
			mode: 'manifest' as const,
			reportSessions: false,
			waitUntil,
		};
		const first = render(options);
		await vi.advanceTimersByTimeAsync(500);
		expect((await first).initialPolicyResolution).toBeUndefined();
		expect(waitUntil).toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(300);
		const second = await render(options);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(second.initialPolicyResolution?.status).toBe('matched');
	});

	test('a render that gave up sends no session report', async () => {
		vi.useFakeTimers();
		const fetch = vi.fn<typeof globalThis.fetch>((input) => {
			const url = String(input);
			if (url.startsWith(GVL_URL)) {
				return new Promise<Response>((resolve) => {
					setTimeout(() => resolve(json(GVL)), 800);
				});
			}
			if (url.endsWith('/sessions')) {
				return Promise.resolve(new Response(null, { status: 202 }));
			}
			return Promise.resolve(json(IAB_MANIFEST));
		});
		const pending = render({
			backendURL: BACKEND,
			fetch,
			mode: 'manifest',
			waitUntil: () => undefined,
		});
		await vi.advanceTimersByTimeAsync(500);
		expect((await pending).initialPolicyResolution).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1000);
		expect(callsTo(fetch, '/sessions')).toHaveLength(0);
	});
});

describe('experiment', () => {
	const experiment = {
		arm: 'b',
		arms: [{ id: 'a' }, { id: 'b' }],
		id: 'banner-test',
	} as unknown as NonNullable<ResolveRequestConsentOptions['experiment']>;

	test('an undecided visitor’s arm goes with hosted /init; the state carries the experiment', async () => {
		const fetch = upstream();
		const state = await render({ backendURL: BACKEND, experiment, fetch });
		expect(sentHeaders(fetch, '/init').get('x-c15t-experiment')).toBe(
			'banner-test=b'
		);
		expect(state.experiment).toBe(experiment);
	});

	test('a visitor who already chose is not counted, but keeps the experiment', async () => {
		const fetch = upstream();
		const state = await render({
			backendURL: BACKEND,
			experiment,
			fetch,
			headers: { cookie: CONSENTED },
		});
		expect(sentHeaders(fetch, '/init').has('x-c15t-experiment')).toBe(false);
		expect(state.experiment).toBe(experiment);
	});

	test('manifest mode reports the arm; a failed upstream still carries the experiment', async () => {
		const fetch = upstream();
		await render({
			backendURL: BACKEND,
			experiment,
			fetch,
			mode: 'manifest',
		});
		await vi.waitFor(() => expect(callsTo(fetch, '/sessions')).toHaveLength(1));
		const body = JSON.parse(String(callsTo(fetch, '/sessions')[0]?.[1]?.body));
		expect(body.experiment).toEqual({ arm: 'b', id: 'banner-test' });

		const failing = vi.fn<typeof globalThis.fetch>(() =>
			Promise.reject(new Error('down'))
		);
		const state = await render({
			backendURL: BACKEND,
			experiment,
			fetch: failing,
		});
		expect(state.experiment).toBe(experiment);
	});
});

describe('session reports', () => {
	test('manifest mode reports to an absolute backend, detached', async () => {
		const fetch = upstream();
		const waitUntil = vi.fn();
		await render({
			backendURL: BACKEND,
			fetch,
			headers: { 'user-agent': 'Visitor/1.0' },
			mode: 'manifest',
			waitUntil,
		});
		await vi.waitFor(() => expect(callsTo(fetch, '/sessions')).toHaveLength(1));
		expect(waitUntil).toHaveBeenCalled();
	});

	test('a relative backend, reportSessions: false and hosted mode send none', async () => {
		const fetch = upstream();
		await render({
			backendURL: '/api/self-host',
			fetch,
			mode: 'manifest',
		});
		await render({
			backendURL: BACKEND,
			fetch,
			mode: 'manifest',
			reportSessions: false,
		});
		await render({ backendURL: BACKEND, fetch });
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(callsTo(fetch, '/sessions')).toHaveLength(0);
	});
});

describe('shared renders', () => {
	const visitor = {
		'accept-language': 'de-DE',
		cookie: CONSENTED,
		'sec-gpc': '1',
		'x-vercel-ip-country': 'DE',
	};

	test('carry no visitor state and skip the hosted and manifest prefetch', async () => {
		const fetch = upstream();
		const states = await Promise.all(
			(['hosted', 'manifest'] as const).map((mode) =>
				render({
					backendURL: BACKEND,
					experiment: {
						arm: 'a',
						arms: [{ id: 'a' }],
						id: 'x',
					} as unknown as NonNullable<
						ResolveRequestConsentOptions['experiment']
					>,
					fetch,
					headers: visitor,
					mode,
					shared: true,
				})
			)
		);
		expect(states).toEqual([{}, {}]);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('keep the site’s configured overrides and still resolve offline', async () => {
		const state = await render({
			headers: visitor,
			offline: {},
			overrides: { language: 'fr' },
			shared: true,
		});
		expect(state.initialRecords).toBeUndefined();
		expect(state.now).toBeUndefined();
		expect(state.initialPrivacySignals).toBeUndefined();
		expect(state.initialOverrides?.language).toBe('fr');
		expect(state.initialOverrides?.country).toBeUndefined();
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});
});
