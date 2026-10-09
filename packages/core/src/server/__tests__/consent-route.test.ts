/**
 * Contract suite for the consent route handler every server adapter mounts.
 *
 * Next.js, TanStack Start, SvelteKit, Astro and Nuxt each used to carry
 * their own copy of these routes, and the copies drifted. Each test here
 * pins one rule for all of them; the adapters only test their wiring.
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
import {
	CONSENT_ROUTE_TIMEOUT_HEADER,
	createConsentRouteHandler,
	readWaitUntil,
} from '../consent-route';
import type { ConsentRouteHandlerOptions } from '../consent-route';
import { clearGvlCache, GVL_FETCH_TIMEOUT_MS } from '../gvl-cache';

const BACKEND = 'https://consent.example.com';
const APP = 'https://app.example.com';
const GVL_URL = 'https://gvl.example/vendor-list.json';

const MANIFEST: ConsentManifest = {
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
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: {
						de: { common: { acceptAll: 'Alle akzeptieren' } },
						en: { common: { acceptAll: 'Accept all' } },
					},
				},
			},
		},
	},
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

type FetchMock = ReturnType<typeof vi.fn<ManifestFetch>>;

const json = function json(
	body: unknown,
	headers: Record<string, string> = {},
	status = 200
): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json', ...headers },
		status,
	});
};

/** A fetch that serves the manifest, the vendor list and session reports. */
const upstream = function upstream(
	manifest: ConsentManifest = MANIFEST,
	manifestHeaders: Record<string, string> = {
		'cache-control': 'public, s-maxage=120, stale-while-revalidate=60',
		'content-language': 'en',
		etag: '"manifest-revision"',
		'last-modified': 'Tue, 01 Sep 2026 00:00:00 GMT',
		vary: 'accept-language',
	}
): FetchMock {
	return vi.fn<ManifestFetch>((input) => {
		const url = String(input instanceof Request ? input.url : input);
		if (url.startsWith(GVL_URL)) {
			return Promise.resolve(json(GVL));
		}
		if (url.endsWith('/sessions')) {
			return Promise.resolve(new Response(null, { status: 202 }));
		}
		return Promise.resolve(json(manifest, manifestHeaders));
	});
};

const route = function route(
	options: Partial<ConsentRouteHandlerOptions> = {}
) {
	return createConsentRouteHandler({
		adapter: '@c15t/test',
		backendURL: BACKEND,
		...options,
	});
};

const request = function request(
	path: string,
	init: RequestInit & { headers?: Record<string, string> } = {}
): Request {
	return new Request(`${APP}${path}`, init);
};

const calledURLs = (fetch: FetchMock): string[] =>
	fetch.mock.calls.map(([input]) => String(input));

const callHeaders = (fetch: FetchMock, index = 0): Headers =>
	new Headers(fetch.mock.calls[index]?.[1]?.headers);

const flush = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

beforeEach(() => {
	clearManifestCache();
	clearGvlCache();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('dispatch', () => {
	test.each([
		['init', 'init'],
		['', 'init'],
		['/init/', 'init'],
		['manifest', 'manifest'],
	])('path %j answers %s', async (path, expected) => {
		const handle = route({ fetch: upstream() });
		const response = await handle(request('/api/c15t/x'), { path });
		expect(response.headers.get('cache-control')).toBe(
			expected === 'init'
				? 'private, no-store'
				: 'public, s-maxage=120, stale-while-revalidate=60'
		);
	});

	test('a fixed mount picks the manifest from its last segment and init otherwise', async () => {
		const handle = route({ fetch: upstream() });
		const manifest = await handle(request('/api/c15t/manifest'));
		const init = await handle(request('/api/c15t'));
		expect(manifest.headers.get('etag')).toBe('"manifest-revision"');
		expect(init.headers.get('cache-control')).toBe('private, no-store');
	});

	test('an unknown path is a 404 that never reaches upstream without the proxy', async () => {
		const fetch = upstream();
		const handle = route({ fetch });
		const unknown = await handle(request('/api/c15t/subjects'), {
			path: 'subjects',
		});
		const write = await handle(
			request('/api/c15t/subjects', { body: '{}', method: 'POST' }),
			{ path: 'subjects' }
		);
		expect(unknown.status).toBe(404);
		expect(write.status).toBe(404);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('rejects long unknown paths in linear time', async () => {
		const path = `unknown/${'/'.repeat(100_000)}missing///`;
		const handle = route({ fetch: upstream() });
		const start = performance.now();
		const response = await handle(request(`/api/c15t/${path}`), {
			path: `///${path}`,
		});
		expect(performance.now() - start).toBeLessThan(1000);
		expect(response.status).toBe(404);
	});
});

describe('upstream source', () => {
	test('reads the manifest below backendURL, or manifestURL when set', async () => {
		const fromBackend = upstream();
		await route({ fetch: fromBackend })(request('/api/c15t/manifest'));
		const fromManifestURL = upstream();
		await route({
			fetch: fromManifestURL,
			manifestURL: 'https://cdn.example.com/m.json',
		})(request('/api/c15t/manifest'));
		expect(calledURLs(fromBackend)).toEqual([`${BACKEND}/manifest`]);
		expect(calledURLs(fromManifestURL)).toEqual([
			'https://cdn.example.com/m.json',
		]);
	});

	test('a relative URL resolves against request.url, never a forged forwarding header', async () => {
		const fetch = upstream();
		await route({ backendURL: '/consent-backend', fetch })(
			request('/api/c15t/manifest', {
				headers: { 'x-forwarded-host': 'evil.example' },
			})
		);
		expect(calledURLs(fetch)).toEqual([`${APP}/consent-backend/manifest`]);
	});

	test('a relative URL resolves against forwarding headers when they are trusted', async () => {
		const fetch = upstream();
		await route({
			backendURL: '/consent-backend',
			fetch,
			trustForwardedHeaders: true,
		})(
			request('/api/c15t/manifest', {
				headers: {
					'x-forwarded-host': 'public.example',
					'x-forwarded-proto': 'https',
				},
			})
		);
		expect(calledURLs(fetch)).toEqual([
			'https://public.example/consent-backend/manifest',
		]);
	});

	test('with localFetch a relative URL is fetched in-process by path, whatever the Host', async () => {
		const fetch = upstream();
		const localFetch = upstream();
		await route({ backendURL: '/api/self-host', fetch })(
			new Request('http://evil.example/api/c15t/manifest'),
			{ localFetch, route: 'manifest' }
		);
		expect(calledURLs(localFetch)).toEqual(['/api/self-host/manifest']);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('an absolute URL uses the configured fetch even with localFetch', async () => {
		const fetch = upstream();
		const localFetch = upstream();
		await route({ fetch })(request('/api/c15t/manifest'), { localFetch });
		expect(calledURLs(fetch)).toEqual([`${BACKEND}/manifest`]);
		expect(localFetch).not.toHaveBeenCalled();
	});

	test('throws without a configured URL, whatever the environment says', async () => {
		vi.stubEnv('C15T_BACKEND_URL', BACKEND);
		vi.stubEnv('C15T_MANIFEST_URL', `${BACKEND}/manifest`);
		const handle = route({ backendURL: undefined });
		await expect(handle(request('/api/c15t/init'))).rejects.toThrow(
			'@c15t/test: pass backendURL or manifestURL.'
		);
		await expect(handle(request('/api/c15t/manifest'))).rejects.toThrow(
			'@c15t/test: pass backendURL or manifestURL.'
		);
	});

	test('rejects a backendURL or manifestURL it cannot resolve', async () => {
		await expect(
			route({ backendURL: 'consent.example.com' })(request('/api/c15t/init'))
		).rejects.toThrow('@c15t/test: invalid backendURL.');
		await expect(
			route({ manifestURL: '//evil.example/manifest' })(
				request('/api/c15t/manifest')
			)
		).rejects.toThrow('@c15t/test: invalid manifestURL.');
	});

	test('an invalid manifestURL is an error, not a reason to fall back to /init', async () => {
		const fetch = upstream();
		await expect(
			route({ fetch, manifestURL: 'not a url' })(request('/api/c15t/init'))
		).rejects.toThrow('@c15t/test: invalid manifestURL.');
		expect(fetch).not.toHaveBeenCalled();
	});

	test('passes the framework fetch hint to the manifest request', async () => {
		const fetch = upstream();
		await route({ fetch, manifestFetchInit: { cache: 'force-cache' } })(
			request('/api/c15t/init')
		);
		expect(fetch.mock.calls[0]?.[1]).toMatchObject({ cache: 'force-cache' });
	});
});

describe('manifest route', () => {
	test('passes the backend cache headers through and invents none', async () => {
		const handle = route({ fetch: upstream() });
		const response = await handle(request('/api/c15t/manifest'));
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/json');
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=120, stale-while-revalidate=60'
		);
		expect(response.headers.get('etag')).toBe('"manifest-revision"');
		expect(response.headers.get('last-modified')).toBe(
			'Tue, 01 Sep 2026 00:00:00 GMT'
		);
		expect(response.headers.get('content-language')).toBe('en');
		// The body depends only on the URL.
		expect(response.headers.get('vary')).toBeNull();
		expect(await response.json()).toEqual(MANIFEST);

		clearManifestCache();
		const bare = await route({ fetch: upstream(MANIFEST, {}) })(
			request('/api/c15t/manifest')
		);
		expect(bare.headers.get('cache-control')).toBeNull();
		expect(bare.headers.get('x-c15t-next-revalidate')).toBeNull();
	});

	test.each([false, true])(
		'forwards the remaining Age from one upstream read, conditional=%s',
		async (conditional) => {
			const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
			const fetch = upstream(MANIFEST, {
				age: '55',
				'cache-control': 's-maxage=60',
				etag: '"v1"',
			});
			const handle = route({ fetch });
			const first = await handle(request('/api/c15t/manifest'));
			expect(first.headers.get('age')).toBe('55');
			clock.mockReturnValue(2000);
			const second = await handle(
				request('/api/c15t/manifest', {
					headers: conditional ? { 'if-none-match': '"v1"' } : {},
				})
			);
			expect(second.status).toBe(conditional ? 304 : 200);
			expect(await second.text()).toBe(
				conditional ? '' : JSON.stringify(MANIFEST)
			);
			expect(second.headers.get('age')).toBe('57');
			expect(second.headers.get('cache-control')).toBe('s-maxage=60');
			expect(fetch).toHaveBeenCalledTimes(1);
		}
	);

	test('serves the body when the ETag does not match', async () => {
		const response = await route({ fetch: upstream() })(
			request('/api/c15t/manifest', { headers: { 'if-none-match': '"old"' } })
		);
		expect(response.status).toBe(200);
	});

	test("hands a stale read's refresh to waitUntil", async () => {
		vi.useFakeTimers();
		const fetch = upstream(MANIFEST, {
			'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
		});
		const registered: Promise<void>[] = [];
		const handle = route({ fetch });
		const waitUntil = (task: Promise<void>) => {
			registered.push(task);
		};
		await handle(request('/api/c15t/manifest'), { waitUntil });
		expect(registered).toHaveLength(0);
		vi.advanceTimersByTime(1500);
		const stale = await handle(request('/api/c15t/manifest'), { waitUntil });
		expect(stale.status).toBe(200);
		expect(registered).toHaveLength(1);
		await expect(registered[0]).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test.each([
		['DE-de', '?language=de-de'],
		['fr', '?language=fr'],
		['<script>', ''],
		['a'.repeat(40), ''],
	])(
		'forwards only a validated language query: %s',
		async (language, search) => {
			const fetch = upstream();
			await route({ fetch })(
				request(
					`/api/c15t/manifest?utm_source=mail&language=${encodeURIComponent(language)}&visitor=42`
				)
			);
			expect(calledURLs(fetch)).toEqual([`${BACKEND}/manifest${search}`]);
		}
	);

	test('the visitor query never splits the cache', async () => {
		const fetch = upstream();
		const handle = route({ fetch });
		await handle(request('/api/c15t/manifest?a=1'));
		await handle(request('/api/c15t/manifest?b=2'));
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test('serves an inline manifest without fetching', async () => {
		const fetch = upstream();
		const handle = route({ fetch, manifest: MANIFEST });
		const response = await handle(request('/api/c15t/manifest'));
		expect(await response.json()).toEqual(MANIFEST);
		const init = await handle(request('/api/c15t/init'), {
			inputs: { country: 'DE' },
		});
		expect(await init.json()).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in' },
		});
		expect(calledURLs(fetch).every((url) => url.endsWith('/sessions'))).toBe(
			true
		);
	});
});

describe('manifest request credentials', () => {
	test('with the proxy on, sends the named cookies and extra headers only', async () => {
		const fetch = upstream();
		await route({
			fetch,
			proxy: { cookieNames: ['c15t'], forwardHeaders: ['authorization'] },
		})(
			request('/api/c15t/manifest', {
				headers: {
					authorization: 'Bearer tenant',
					cookie: 'session=secret; c15t=abc',
				},
			})
		);
		const headers = callHeaders(fetch);
		expect(headers.get('cookie')).toBe('c15t=abc');
		expect(headers.get('authorization')).toBe('Bearer tenant');
	});

	test('without the proxy, sends no credentials', async () => {
		const fetch = upstream();
		await route({ fetch })(
			request('/api/c15t/manifest', { headers: { cookie: 'c15t=abc' } })
		);
		expect(callHeaders(fetch).get('cookie')).toBeNull();
	});

	test('answers a credentialed read private, without validators', async () => {
		const fetch = upstream(MANIFEST, {
			'cache-control': 'public, s-maxage=120',
			etag: '"rev"',
		});
		const handle = route({ fetch, proxy: { cookieNames: ['c15t'] } });
		const credentialed = await handle(
			request('/api/c15t/manifest', {
				headers: { cookie: 'c15t=abc', 'if-none-match': '"rev"' },
			})
		);
		expect(credentialed.status).toBe(200);
		expect(credentialed.headers.get('cache-control')).toBe('private, no-store');
		expect(credentialed.headers.get('etag')).toBeNull();
		const anonymous = await handle(request('/api/c15t/manifest'));
		expect(anonymous.headers.get('cache-control')).toBe('public, s-maxage=120');
	});

	test('never copies the client hop chain onto the manifest request', async () => {
		const fetch = upstream();
		await route({
			fetch,
			proxy: {
				forwardHeaders: [
					'x-forwarded-host',
					'x-forwarded-for',
					'x-forwarded-proto',
				],
			},
		})(
			request('/api/c15t/manifest', {
				headers: {
					'x-forwarded-for': '203.0.113.7',
					'x-forwarded-host': 'evil.example',
					'x-forwarded-proto': 'http',
				},
			})
		);
		const headers = callHeaders(fetch);
		expect(headers.get('x-forwarded-host')).toBeNull();
		expect(headers.get('x-forwarded-for')).toBeNull();
		expect(headers.get('x-forwarded-proto')).toBeNull();
	});

	test('drops identity headers before a cleartext manifest request', async () => {
		const fetch = upstream();
		const response = await route({
			backendURL: 'http://backend.example',
			fetch,
			proxy: { forwardHeaders: ['x-api-key', 'accept-language'] },
		})(
			request('/api/c15t/manifest', {
				headers: { 'accept-language': 'de', 'x-api-key': 'tenant-a' },
			})
		);
		expect(response.status).toBe(200);
		const headers = callHeaders(fetch);
		expect(headers.get('x-api-key')).toBeNull();
		expect(headers.get('accept-language')).toBe('de');
	});
});

describe('init route', () => {
	test('resolves geo, language and GPC locally and is never shared-cached', async () => {
		const fetch = upstream();
		const response = await route({ fetch, reportSessions: false })(
			request('/api/c15t/init', {
				headers: {
					'accept-language': 'de-DE,de;q=0.9',
					'x-c15t-gpc': '1',
					'x-vercel-ip-country': 'DE',
					'x-vercel-ip-country-region': 'BE',
				},
			})
		);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('x-c15t-policy-contract')).toBe('1');
		const body = (await response.json()) as InitOutput;
		expect(body.location).toEqual({ countryCode: 'DE', regionCode: 'BE' });
		expect(body.translations.language).toBe('de');
		expect(body.policyResolution).toMatchObject({
			policyId: 'eu-opt-in',
			status: 'matched',
		});
		expect(calledURLs(fetch)).toEqual([`${BACKEND}/manifest`]);
	});

	test('echoes the resolved inputs so a server-rendered page keeps GPC', async () => {
		const response = await route({ fetch: upstream() })(
			request('/api/c15t/init', {
				headers: { 'x-c15t-country': 'DE', 'x-c15t-gpc': '1' },
			})
		);
		expect(await response.json()).toMatchObject({
			resolvedOverrides: { country: 'DE', language: 'en' },
			resolvedPrivacySignals: { gpc: true },
		});
	});

	test('adapter-supplied inputs win over the request headers', async () => {
		const response = await route({ fetch: upstream() })(
			request('/api/c15t/init', {
				headers: { 'accept-language': 'en', 'x-c15t-country': 'US' },
			}),
			{ inputs: { country: 'DE', language: 'de' } }
		);
		expect(await response.json()).toMatchObject({
			location: { countryCode: 'DE' },
			policyResolution: { policyId: 'eu-opt-in' },
			translations: { language: 'de' },
		});
	});

	test('reads the inputs a browser sends as query parameters', async () => {
		const response = await route({ fetch: upstream() })(
			request(
				'/api/c15t/init?c15tVersion=3.1.0&c15tPolicyContract=1&c15tCountry=DE&c15tGpc=1',
				{ headers: { 'x-c15t-country': 'US' } }
			)
		);
		expect(await response.json()).toMatchObject({
			location: { countryCode: 'DE' },
			policyResolution: { policyId: 'eu-opt-in', status: 'matched' },
			resolvedPrivacySignals: { gpc: true },
		});
	});

	test('fails a client that declares an unknown contract in the query', async () => {
		const response = await route({ fetch: upstream() })(
			request('/api/c15t/init?c15tPolicyContract=99&c15tCountry=DE')
		);
		expect((await response.json()).policyResolution).toMatchObject({
			reason: 'unsupported-contract',
			status: 'failed',
		});
	});

	test('query overrides win over adapter-supplied inputs, as override headers did', async () => {
		const response = await route({ fetch: upstream() })(
			request('/api/c15t/init?c15tCountry=DE'),
			{ inputs: { country: 'US', language: 'de' } }
		);
		expect(await response.json()).toMatchObject({
			location: { countryCode: 'DE' },
			translations: { language: 'de' },
		});
	});

	test.each([undefined, '1', ' 1 '])(
		'serves a client that declares contract %j',
		async (contract) => {
			const headers: Record<string, string> = { 'x-c15t-country': 'DE' };
			if (contract !== undefined) {
				headers['x-c15t-policy-contract'] = contract;
			}
			const response = await route({ fetch: upstream() })(
				request('/api/c15t/init', { headers })
			);
			expect(await response.json()).toMatchObject({
				policyResolution: { status: 'matched' },
			});
		}
	);

	test.each(['99', 'invalid', ''])(
		'fails a client that declares contract %j and strips matched-only fields',
		async (contract) => {
			const gvlFetch = upstream(IAB_MANIFEST);
			const response = await route({ fetch: gvlFetch })(
				request('/api/c15t/init', {
					headers: {
						'x-c15t-country': 'DE',
						'x-c15t-policy-contract': contract,
					},
				})
			);
			const body = await response.json();
			expect(body.policyResolution).toEqual({
				policy: null,
				reason: 'unsupported-contract',
				status: 'failed',
				version: 1,
			});
			for (const field of [
				'policySnapshotToken',
				'gvl',
				'gvlReference',
				'cmpId',
				'customVendors',
			]) {
				expect(body).not.toHaveProperty(field);
			}
			expect(body.translations.language).toBe('en');
			// No vendor list for a client that cannot represent the policy.
			expect(calledURLs(gvlFetch).some((url) => url.startsWith(GVL_URL))).toBe(
				false
			);
		}
	);
});

describe('vendor list', () => {
	test('is not loaded for a policy that is not IAB', async () => {
		const fetchGvl = vi.fn(() => Promise.resolve(GVL));
		await route({ fetch: upstream(), fetchGvl })(
			request('/api/c15t/init', { headers: { 'x-c15t-country': 'DE' } })
		);
		expect(fetchGvl).not.toHaveBeenCalled();
	});

	test('is loaded in the resolved language, deferred to this route and served by version', async () => {
		const fetchGvl = vi.fn(() => Promise.resolve(GVL));
		const handle = route({ fetch: upstream(IAB_MANIFEST), fetchGvl });
		const response = await handle(
			request('/privacy/init', {
				headers: { 'accept-language': 'de-DE,de;q=0.9' },
			})
		);
		const body = (await response.json()) as InitOutput;
		expect(fetchGvl).toHaveBeenCalledWith(
			expect.objectContaining({ language: 'de', reference: { url: GVL_URL } })
		);
		expect(body.gvl).toBeNull();
		expect(body.cmpId).toBe(28);
		expect(body.gvlReference).toMatchObject({
			language: 'de',
			summary: { vendorCount: 1 },
			url: '/privacy/init?c15t-gvl=42&language=de',
			vendorListVersion: 42,
		});

		const list = await handle(request(body.gvlReference?.url ?? ''));
		expect(list.headers.get('cache-control')).toBe('public, max-age=86400');
		expect(await list.json()).toEqual(GVL);
		const mismatch = await handle(
			request('/privacy/init?c15t-gvl=43&language=de')
		);
		expect(mismatch.status).toBe(409);
		const invalid = await handle(
			request('/privacy/init?c15t-gvl=42&language=../en')
		);
		expect(invalid.status).toBe(400);
	});

	test('the default loader reads through the process cache with the protocol headers', async () => {
		const fetch = upstream(IAB_MANIFEST);
		const handle = route({ fetch, reportSessions: false });
		await handle(request('/api/c15t/init'));
		await handle(request('/api/c15t/init'));
		await handle(request('/api/c15t/init?c15t-gvl=42&language=en'));
		const gvlCalls = fetch.mock.calls.filter(([url]) =>
			String(url).startsWith(GVL_URL)
		);
		expect(gvlCalls).toHaveLength(1);
		const headers = new Headers(gvlCalls[0]?.[1]?.headers);
		expect(headers.get('accept-language')).toBe('en');
		expect(headers.get('x-c15t-policy-contract')).toBe('1');
	});

	test('a list that cannot be loaded fails the request instead of turning IAB off', async () => {
		const fetch = upstream(IAB_MANIFEST);
		const handle = route({
			fetch,
			fetchGvl: () => Promise.reject(new Error('gvl is down')),
		});
		await expect(handle(request('/api/c15t/init'))).rejects.toThrow(
			'gvl is down'
		);
		await flush();
		// No resolution was served, so none is reported.
		expect(calledURLs(fetch).some((url) => url.endsWith('/sessions'))).toBe(
			false
		);
	});

	test('the default loader gives up on a hung list after its deadline', async () => {
		const deadlines: AbortController[] = [];
		const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
			const controller = new AbortController();
			deadlines.push(controller);
			return controller.signal;
		});
		const fetch = vi.fn<ManifestFetch>((input, init) => {
			if (String(input).startsWith(GVL_URL)) {
				return new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new Error('deadline'))
					);
				});
			}
			return Promise.resolve(json(IAB_MANIFEST));
		});
		const pending = route({ fetch, reportSessions: false })(
			request('/api/c15t/init')
		);
		await flush();
		expect(timeout).toHaveBeenCalledWith(GVL_FETCH_TIMEOUT_MS);
		deadlines.at(-1)?.abort();
		await expect(pending).rejects.toThrow('deadline');
	});
});

describe('session reports', () => {
	const reportCall = (fetch: FetchMock) =>
		fetch.mock.calls.find(([url]) => String(url) === `${BACKEND}/sessions`);

	test('reports the resolution to the backend, detached and without cookies', async () => {
		const fetch = upstream();
		const registered: Promise<void>[] = [];
		const response = await route({ fetch })(
			request('/api/c15t/init', {
				headers: {
					cookie: 'c15t=secret',
					'user-agent': 'Mozilla/5.0',
					'x-c15t-gpc': '1',
					'x-forwarded-for': '203.0.113.42',
					'x-vercel-ip-country': 'DE',
				},
			}),
			{ waitUntil: (task) => registered.push(task) }
		);
		expect(response.status).toBe(200);
		expect(registered).toHaveLength(1);
		await registered[0];
		const init = reportCall(fetch)?.[1];
		expect(init?.method).toBe('POST');
		const headers = init?.headers as Record<string, string>;
		expect(headers['x-c15t-client-ip']).toBe('203.0.113.42');
		expect(headers['user-agent']).toBe('Mozilla/5.0');
		expect(headers).not.toHaveProperty('cookie');
		expect(JSON.parse(init?.body as string)).toMatchObject({
			adapter: '@c15t/test',
			country: 'DE',
			gpc: true,
			policy: { id: 'eu-opt-in' },
			revision: 'manifest-revision',
			source: 'route',
		});
	});

	test('puts the journey from the browser request on the report', async () => {
		const fetch = upstream();
		const registered: Promise<void>[] = [];
		const id = '3b241101-e2bb-4255-8caf-4136c566a962';
		await route({ fetch })(
			request(
				`/api/c15t/init?c15tJourney=${id}&c15tJourneyScope=page&c15tStored=0`,
				{ headers: { 'x-vercel-ip-country': 'DE' } }
			),
			{ waitUntil: (task) => registered.push(task) }
		);
		await registered[0];
		expect(JSON.parse(reportCall(fetch)?.[1]?.body as string).journey).toEqual({
			domain: 'app.example.com',
			id,
			prompt: 'due',
			scope: 'page',
			storedChoice: false,
		});
	});

	test('reports no journey for malformed parameters', async () => {
		const fetch = upstream();
		const registered: Promise<void>[] = [];
		await route({ fetch })(
			request(
				'/api/c15t/init?c15tJourney=visitor-42&c15tJourneyScope=page&c15tStored=0'
			),
			{ waitUntil: (task) => registered.push(task) }
		);
		await registered[0];
		expect(
			JSON.parse(reportCall(fetch)?.[1]?.body as string)
		).not.toHaveProperty('journey');
	});

	test.each([
		['a HEAD probe', {}, { method: 'HEAD' }],
		['reportSessions: false', { reportSessions: false }, {}],
		['a relative backendURL', { backendURL: '/api/self-host' }, {}],
		[
			'a manifestURL alone',
			{ backendURL: undefined, manifestURL: `${BACKEND}/manifest` },
			{},
		],
	] as const)('sends none for %s', async (_, options, init) => {
		const fetch = upstream();
		const response = await route({ fetch, ...options })(
			request('/api/c15t/init', init)
		);
		expect(response.status).toBe(200);
		await flush();
		expect(calledURLs(fetch).some((url) => url.endsWith('/sessions'))).toBe(
			false
		);
	});

	test('sends none for a request whose client went away', async () => {
		const fetch = upstream();
		const controller = new AbortController();
		controller.abort();
		await route({ fetch })(
			request('/api/c15t/init', { signal: controller.signal })
		);
		await flush();
		expect(reportCall(fetch)).toBeUndefined();
	});
});

describe('client abort', () => {
	test('hands the rest of an abandoned request to waitUntil', async () => {
		let finish: (response: Response) => void = () => undefined;
		const fetch = vi.fn<ManifestFetch>(
			() =>
				new Promise<Response>((resolve) => {
					finish = resolve;
				})
		);
		const controller = new AbortController();
		const registered: Promise<void>[] = [];
		const pending = route({ fetch, reportSessions: false })(
			request('/api/c15t/init', { signal: controller.signal }),
			{ waitUntil: (task) => registered.push(task) }
		);
		await flush();
		controller.abort();
		expect(registered).toHaveLength(1);
		finish(json(MANIFEST));
		await pending;
		await expect(registered[0]).resolves.toBeUndefined();
	});
});

describe('request budget', () => {
	const hanging: ManifestFetch = (_url, init) =>
		new Promise((_resolve, reject) => {
			init?.signal?.addEventListener('abort', () =>
				reject(init.signal?.reason)
			);
		});

	test('fails within the budget header without falling back to /init', async () => {
		const fetch = vi.fn<ManifestFetch>(hanging);
		const startedAt = Date.now();
		// The cache gets what is left of the header's 20 ms, which is less
		// once a millisecond ticks before the read starts.
		await expect(
			route({ fetch })(
				request('/api/c15t/init', {
					headers: { [CONSENT_ROUTE_TIMEOUT_HEADER]: '20' },
				})
			)
		).rejects.toThrow(/no manifest within (?:1?\d|20) ms/u);
		expect(Date.now() - startedAt).toBeLessThan(2000);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test('bounds the vendor list and leaves it filling for the next request', async () => {
		let finishList: (response: Response) => void = () => undefined;
		const fetch = vi.fn<ManifestFetch>((url) =>
			String(url) === GVL_URL
				? new Promise<Response>((resolve) => {
						finishList = resolve;
					})
				: Promise.resolve(json(IAB_MANIFEST))
		);
		const registered: Promise<void>[] = [];
		await expect(
			route({ fetch, reportSessions: false })(
				request('/api/c15t/init', {
					headers: { [CONSENT_ROUTE_TIMEOUT_HEADER]: '50' },
				}),
				{ waitUntil: (task) => registered.push(task) }
			)
		).rejects.toThrow(/did not finish/u);
		expect(calledURLs(fetch).some((url) => url.endsWith('/init'))).toBe(false);
		expect(registered).toHaveLength(1);
		finishList(json(GVL));
		await expect(registered[0]).resolves.toBeUndefined();
	});

	test('bounds the /init fallback, even through a fetch that drops the signal', async () => {
		const localFetch = vi.fn<ManifestFetch>((url) =>
			String(url).endsWith('/manifest')
				? Promise.resolve(new Response('missing', { status: 404 }))
				: new Promise(() => {
						// Never answers.
					})
		);
		const startedAt = Date.now();
		await expect(
			route({ backendURL: '/api/self-host' })(
				request('/api/c15t/init', {
					headers: { [CONSENT_ROUTE_TIMEOUT_HEADER]: '50' },
				}),
				{ localFetch }
			)
		).rejects.toThrow();
		expect(Date.now() - startedAt).toBeLessThan(2000);
		expect(localFetch).toHaveBeenLastCalledWith(
			'/api/self-host/init',
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
	});

	test.each(['soon', '-1', '1.5'])(
		'ignores a budget header of %j',
		async (value) => {
			const response = await route({ fetch: upstream() })(
				request('/api/c15t/init', {
					headers: { [CONSENT_ROUTE_TIMEOUT_HEADER]: value },
				})
			);
			expect(response.status).toBe(200);
		}
	);
});

describe('/init fallback for a backend without /manifest', () => {
	const backendInit = (
		body: Record<string, unknown>,
		headers: Record<string, string> = { 'x-c15t-policy-contract': '1' }
	) =>
		vi.fn<ManifestFetch>((url) =>
			Promise.resolve(
				String(url).endsWith('/manifest')
					? new Response('missing', { status: 404 })
					: json(body, headers)
			)
		);

	const matchedIab = () =>
		writePolicyResolutionWire(
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
		);

	test('asks backend /init in-process, forwarding only the consent request headers', async () => {
		const localFetch = backendInit({
			location: { countryCode: null, regionCode: null },
			translations: { language: 'en', translations: {} },
		});
		const response = await route({ backendURL: '/api/self-host' })(
			request('/api/c15t/init', {
				headers: {
					cookie: 'c15t=secret',
					'user-agent': 'Mozilla/5.0',
					'x-c15t-country': 'DE',
					'x-forwarded-for': '203.0.113.42',
				},
			}),
			{ localFetch }
		);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('x-c15t-policy-contract')).toBe('1');
		expect(await response.json()).toMatchObject({
			location: { countryCode: null, regionCode: null },
		});
		expect(localFetch).toHaveBeenLastCalledWith(
			'/api/self-host/init',
			expect.anything()
		);
		const headers = callHeaders(localFetch, 1);
		expect(headers.get('x-c15t-country')).toBe('DE');
		expect(headers.get('x-c15t-policy-contract')).toBe('1');
		expect(headers.get('cookie')).toBeNull();
		expect(headers.get('user-agent')).toBeNull();
		expect(headers.get('x-forwarded-for')).toBeNull();
	});

	test('forwards the browser journey to backend /init and nothing else from the query', async () => {
		const localFetch = backendInit({
			location: { countryCode: null, regionCode: null },
			translations: { language: 'en', translations: {} },
		});
		const id = '3b241101-e2bb-4255-8caf-4136c566a962';
		await route({ backendURL: '/api/self-host' })(
			request(
				`/api/c15t/init?utm_source=mail&c15tJourney=${id}&c15tJourneyScope=tab&c15tStored=1`
			),
			{ localFetch }
		);
		expect(localFetch).toHaveBeenLastCalledWith(
			`/api/self-host/init?c15tJourney=${id}&c15tJourneyScope=tab&c15tStored=1`,
			expect.anything()
		);
	});

	test('forwards the browser query overrides to backend /init as headers', async () => {
		// Server to server there is no CORS, and every backend version reads
		// the headers.
		const localFetch = backendInit({
			location: { countryCode: null, regionCode: null },
			translations: { language: 'en', translations: {} },
		});
		await route({ backendURL: '/api/self-host' })(
			request('/api/c15t/init?c15tCountry=DE&c15tGpc=0&c15tPolicyContract=1'),
			{ localFetch }
		);
		expect(localFetch).toHaveBeenLastCalledWith(
			'/api/self-host/init',
			expect.anything()
		);
		const headers = callHeaders(localFetch, 1);
		expect(headers.get('x-c15t-country')).toBe('DE');
		expect(headers.get('x-c15t-gpc')).toBe('0');
	});

	test('names the page origin on the backend /init it forwards a journey to', async () => {
		const fetch = backendInit({
			location: { countryCode: null, regionCode: null },
			translations: { language: 'en', translations: {} },
		});
		const id = '3b241101-e2bb-4255-8caf-4136c566a962';
		const handle = route({ backendURL: BACKEND, fetch });
		const query = `?c15tJourney=${id}&c15tJourneyScope=page&c15tStored=0`;
		const lastInitOrigin = () =>
			new Headers(
				fetch.mock.calls.findLast(([url]) => String(url).includes('/init'))?.[1]
					?.headers
			).get('origin');
		// A same-origin GET carries no Origin: the request URL is the page's.
		await handle(request(`/api/c15t/init${query}`));
		expect(lastInitOrigin()).toBe(APP);
		// One the browser sent wins.
		await handle(
			request(`/api/c15t/init${query}`, {
				headers: { origin: 'https://www.example.org' },
			})
		);
		expect(lastInitOrigin()).toBe('https://www.example.org');
		// Without a journey nothing is added.
		await handle(request('/api/c15t/init'));
		expect(lastInitOrigin()).toBeNull();
	});

	test('forwards vendors and privacy signals from backend /init', async () => {
		const acmeVendor = {
			category: 'marketing',
			id: 'acme',
			name: 'Acme',
			privacyPolicyUrl: 'https://acme.example/privacy',
		};
		const fetch = backendInit({
			// A v2 backend still sends the jurisdiction label; v3 drops it.
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: null },
			resolvedPrivacySignals: { gpc: true },
			translations: { language: 'en', translations: {} },
			vendorListVersion: '2026-09',
			vendors: [acmeVendor],
		});
		const response = await route({ fetch })(
			request('/api/c15t/init', { headers: { 'x-c15t-country': 'DE' } })
		);
		const body = await response.json();
		expect(body).toMatchObject({
			resolvedPrivacySignals: { gpc: true },
			vendorListVersion: '2026-09',
			vendors: [acmeVendor],
		});
		expect(body).not.toHaveProperty('jurisdiction');
	});

	test('keeps a deferred vendor list from the backend', async () => {
		const gvlReference = {
			language: 'en',
			summary: { items: ['Storage'], vendorCount: 2 },
			url: '/vendor-list',
			vendorListVersion: 42,
		};
		const fetch = backendInit({
			cmpId: 28,
			gvlReference,
			location: { countryCode: 'DE', regionCode: null },
			policyResolution: matchedIab(),
			translations: { language: 'en', translations: {} },
		});
		const response = await route({ fetch })(
			request('/api/c15t/init', {
				headers: { 'x-c15t-policy-contract': '1' },
			})
		);
		expect(await response.json()).toMatchObject({ cmpId: 28, gvlReference });
	});

	test.each([
		{ reason: 'transport', status: 'failed' },
		{ status: 'no-match' },
		{ status: 'unconfigured' },
	])(
		'drops stale policy evidence after a $status answer',
		async (resolution) => {
			const fetch = backendInit({
				branding: 'c15t',
				cmpId: 7,
				customVendors: [{ id: 'stale' }],
				gvl: { vendorListVersion: 1 },
				location: { countryCode: 'DE', regionCode: null },
				policy: { id: 'stale', model: 'iab' },
				policyDecision: { policyId: 'stale' },
				policyResolution: { policy: null, version: 1, ...resolution },
				policySnapshotToken: 'stale-token',
				subjectId: 'backend+literal',
				translations: { language: 'en', translations: {} },
			});
			const response = await route({ fetch })(
				request('/api/c15t/init', {
					headers: { 'x-c15t-policy-contract': '1' },
				})
			);
			const body = await response.json();
			expect(body.policyResolution.status).toBe(resolution.status);
			for (const key of [
				'policy',
				'policyDecision',
				'policySnapshotToken',
				'gvl',
				'cmpId',
				'customVendors',
			]) {
				expect(body).not.toHaveProperty(key);
			}
			expect(body.branding).toBe('c15t');
			expect(body.subjectId).toBe('backend+literal');
		}
	);

	test.each([
		{ declaration: undefined, reason: 'unsupported-contract' },
		{ declaration: '1', reason: 'invalid-payload' },
		{ declaration: '99', reason: 'unsupported-contract' },
		{ declaration: 'invalid', reason: 'unsupported-contract' },
	])(
		'negotiates a backend that declares contract $declaration',
		async ({ declaration, reason }) => {
			const fetch = backendInit(
				{
					location: { countryCode: 'DE', regionCode: null },
					policy: { id: 'legacy', model: 'opt-in' },
					translations: { language: 'en', translations: {} },
				},
				declaration === undefined
					? {}
					: { 'x-c15t-policy-contract': declaration }
			);
			const response = await route({ fetch })(
				request('/api/c15t/init', {
					headers: { 'x-c15t-policy-contract': '1' },
				})
			);
			expect(await response.json()).toMatchObject({
				policyResolution: { reason, status: 'failed' },
			});
		}
	);

	test('does not send every request to /init while the manifest backs off', async () => {
		const fetch = vi.fn<ManifestFetch>(() =>
			Promise.resolve(new Response('unavailable', { status: 503 }))
		);
		const handle = route({ fetch });
		await expect(handle(request('/api/c15t/init'))).rejects.toThrow(/503/u);
		await expect(handle(request('/api/c15t/init'))).rejects.toThrow();
		// The first request tried the manifest and fell back to /init once.
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test('keeps falling back for a backend that has no /manifest', async () => {
		const fetch = backendInit({
			location: { countryCode: 'DE', regionCode: null },
			policyResolution: matchedIab(),
			translations: { language: 'en', translations: {} },
		});
		const handle = route({ fetch });
		expect((await handle(request('/api/c15t/init'))).ok).toBe(true);
		expect((await handle(request('/api/c15t/init'))).ok).toBe(true);
		expect(calledURLs(fetch).filter((url) => url.endsWith('/init'))).toEqual([
			`${BACKEND}/init`,
			`${BACKEND}/init`,
		]);
	});

	test('surfaces the failure when only a manifestURL is configured', async () => {
		const fetch = vi.fn<ManifestFetch>(() =>
			Promise.resolve(new Response('nope', { status: 503 }))
		);
		await expect(
			route({
				backendURL: undefined,
				fetch,
				manifestURL: `${BACKEND}/manifest`,
			})(request('/api/c15t/manifest'))
		).rejects.toThrow(/503/u);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});

describe('proxy', () => {
	test('keeps manifest and init in-process and forwards other paths and writes', async () => {
		const fetch = upstream();
		const handle = route({ fetch, proxy: true, reportSessions: false });
		await handle(request('/api/c15t/manifest'), { path: 'manifest' });
		await handle(request('/api/c15t/init'), { path: 'init' });
		expect(calledURLs(fetch)).toEqual([`${BACKEND}/manifest`]);

		fetch.mockImplementation(() =>
			Promise.resolve(json({ ok: true }, {}, 201))
		);
		const saved = await handle(
			request('/api/c15t/subjects?x=1', {
				body: '{"choice":"all"}',
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
			{ path: 'subjects' }
		);
		expect(saved.status).toBe(201);
		const [url, init] = fetch.mock.calls.at(-1) ?? [];
		expect(url).toBe(`${BACKEND}/subjects?x=1`);
		expect(init?.method).toBe('POST');
		const health = await handle(request('/api/c15t/reports/manifest'), {
			path: 'reports/manifest',
		});
		expect(health.status).toBe(404);
	});

	test('a dedicated proxy mount forwards its last segment', async () => {
		const fetch = vi.fn<ManifestFetch>(() => Promise.resolve(json({})));
		await route({ fetch, proxy: true })(request('/api/c15t/status'), {
			route: 'proxy',
		});
		expect(calledURLs(fetch)).toEqual([`${BACKEND}/status`]);
	});

	test('without trusted forwarding, believes only the request URL', async () => {
		const fetch = vi.fn<ManifestFetch>(() => Promise.resolve(json({})));
		await route({ fetch, proxy: true })(
			request('/api/c15t/subjects', {
				headers: {
					'x-forwarded-for': '198.51.100.1',
					'x-forwarded-host': 'evil.example',
				},
				method: 'POST',
			}),
			{ path: 'subjects' }
		);
		const headers = callHeaders(fetch);
		expect(headers.get('x-forwarded-host')).toBe('app.example.com');
		expect(headers.get('x-forwarded-proto')).toBe('https');
		expect(headers.get('x-forwarded-for')).toBeNull();
		expect(headers.get('x-c15t-proxy')).toBe('@c15t/test');
	});

	test('with trusted forwarding, keeps the chain and appends the client address', async () => {
		const fetch = vi.fn<ManifestFetch>(() => Promise.resolve(json({})));
		await route({ fetch, proxy: true, trustForwardedHeaders: true })(
			request('/api/c15t/subjects', {
				headers: {
					'cf-connecting-ip': '203.0.113.9',
					'x-forwarded-host': 'public.example',
					'x-forwarded-proto': 'https',
				},
				method: 'POST',
			}),
			{ path: 'subjects' }
		);
		const headers = callHeaders(fetch);
		expect(headers.get('x-forwarded-host')).toBe('public.example');
		expect(headers.get('x-forwarded-for')).toBe('203.0.113.9');
	});

	test('uses the hop chain the adapter vouches for', async () => {
		const fetch = vi.fn<ManifestFetch>(() => Promise.resolve(json({})));
		await route({ fetch, proxy: true })(
			request('/api/c15t/subjects', { method: 'POST' }),
			{
				forwarding: () => ({
					for: '192.0.2.5',
					host: 'framework.example',
					proto: 'https',
				}),
				path: 'subjects',
			}
		);
		const headers = callHeaders(fetch);
		expect(headers.get('x-forwarded-for')).toBe('192.0.2.5');
		expect(headers.get('x-forwarded-host')).toBe('framework.example');
	});

	test('forwards to a relative backend through localFetch', async () => {
		const localFetch = vi.fn<ManifestFetch>(() => Promise.resolve(json({})));
		await route({ backendURL: '/api/self-host', proxy: true })(
			new Request('http://evil.example/api/c15t/subjects', { method: 'POST' }),
			{ localFetch, path: 'subjects' }
		);
		expect(calledURLs(localFetch)).toEqual(['/api/self-host/subjects']);
	});

	test('needs a backendURL', async () => {
		await expect(
			route({
				backendURL: undefined,
				manifestURL: `${BACKEND}/manifest`,
				proxy: true,
			})(request('/api/c15t/subjects', { method: 'POST' }), {
				path: 'subjects',
			})
		).rejects.toThrow('@c15t/test: pass backendURL to use proxy.');
	});
});

describe('readWaitUntil', () => {
	test('binds the platform method to its holder', () => {
		const holder = {
			tasks: [] as Promise<unknown>[],
			waitUntil(task: Promise<unknown>) {
				this.tasks.push(task);
			},
		};
		const task = Promise.resolve();
		readWaitUntil(holder)?.(task);
		expect(holder.tasks).toEqual([task]);
		expect(readWaitUntil({})).toBeUndefined();
		expect(readWaitUntil(undefined)).toBeUndefined();
	});
});
