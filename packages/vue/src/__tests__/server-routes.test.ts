/**
 * Coverage for the Nitro server routes the module injects in manifest mode.
 *
 * These are the pieces that decide whether the manifest is edge-cacheable and
 * whether a relative `backendURL` resolves at all — both silent failures if
 * they regress, since the app still renders either way.
 */
import type { ConsentManifest } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { createApp, toWebHandler } from 'h3';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	clearManifestRouteCache,
	fetchCachedManifest,
	MANIFEST_DEDUPE_TTL_SECONDS,
} from '../runtime/server/manifest-mode';
import {
	createInitRoute,
	createManifestRoute,
} from '../runtime/server/route-factories';
import { createServerFetch } from '../runtime/server/server-fetch';

const mocks = vi.hoisted(() => ({
	localFetch: vi.fn(),
	serverFetch: vi.fn(),
	useRuntimeConfig: vi.fn(),
}));

const MANIFEST: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: [],
			id: 'eu-opt-in',
			match: { countries: ['DE'], fallback: true },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
			validity: { choiceDays: 365 },
		}),
	],
	revision: 'rev-1',
	schemaVersion: 2,
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: { en: { common: { acceptAll: 'Accept all' } } },
				},
			},
		},
	},
};

const manifestResponse = function manifestResponse(
	headers: Record<string, string>
) {
	return new Response(JSON.stringify(MANIFEST), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});
};

/**
 * Drives the real handler through h3 so we assert on a real Response.
 *
 * The mounting call is cast because the workspace currently resolves h3 v1 at
 * runtime while type resolution picks up the h3 v2 pulled in transitively by
 * nitro, and their `app.use` overloads disagree. Runtime behaviour is
 * unaffected — this is the v1 `use(route, handler)` form the installed h3
 * actually implements.
 */
type MountRoute = (route: string, handler: unknown) => unknown;

const callRoute = function callRoute(path: string, handler: unknown) {
	return (requestHeaders: Record<string, string> = {}) => {
		const app = createApp();
		(app.use as unknown as MountRoute)(path, handler);
		return toWebHandler(app)(
			new Request(`http://localhost${path}`, { headers: requestHeaders })
		);
	};
};

const routeDependencies = {
	defineCachedEventHandler: (handler: unknown) => handler,
	fetch: mocks.serverFetch,
	useRuntimeConfig: mocks.useRuntimeConfig,
};
const callManifestRoute = callRoute(
	'/api/c15t/manifest',
	createManifestRoute(routeDependencies)
);
const callInitRoute = callRoute(
	'/api/c15t/init',
	createInitRoute(routeDependencies)
);

beforeEach(() => {
	clearManifestRouteCache();
	mocks.useRuntimeConfig.mockReturnValue({
		public: { c15t: { backendURL: '/api/self-host' } },
	});
});

afterEach(() => {
	clearManifestRouteCache();
	vi.clearAllMocks();
});

describe('manifest route caching headers', () => {
	test("forwards the backend's Cache-Control and ETag verbatim", async () => {
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({
				'cache-control': 'public, s-maxage=120, stale-while-revalidate=600',
				etag: '"rev-1"',
			})
		);

		const response = await callManifestRoute();

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=120, stale-while-revalidate=600'
		);
		expect(response.headers.get('etag')).toBe('"rev-1"');
		expect(await response.json()).toMatchObject({ revision: 'rev-1' });
	});

	test('does not forward Vary — the body depends only on the URL', async () => {
		// The backend pairs `Vary: Origin` with an `Access-Control-Allow-Origin`
		// this route never passes through, so forwarding it would fragment the
		// edge cache for nothing.
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({
				'cache-control': 'public, s-maxage=120',
				etag: '"rev-1"',
				vary: 'Origin',
			})
		);

		const response = await callManifestRoute();

		expect(response.headers.get('vary')).toBeNull();
	});

	test('invents no Cache-Control when the backend sends none', async () => {
		mocks.serverFetch.mockResolvedValue(manifestResponse({ etag: '"rev-1"' }));

		const response = await callManifestRoute();

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBeNull();
	});

	test('answers a matching If-None-Match with 304 and no body', async () => {
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({
				'cache-control': 'public, s-maxage=120',
				etag: '"rev-1"',
			})
		);

		const response = await callManifestRoute({ 'if-none-match': '"rev-1"' });

		expect(response.status).toBe(304);
		expect(await response.text()).toBe('');
	});
});

describe('fetchCachedManifest upstream dedupe', () => {
	const config = { manifestURL: 'https://backend.example/manifest' };

	test('dedupes for a short floor when the backend sends no Cache-Control', async () => {
		// Regression: the route no longer uses `defineCachedEventHandler` (it
		// stamped its own headers over the backend's), so the in-process cache
		// is the only thing standing between an older backend and one upstream
		// fetch per request.
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		const fetchMock = vi.fn(async () => manifestResponse({}));

		await fetchCachedManifest({ config, fetch: fetchMock, now: 1000 });
		await fetchCachedManifest({ config, fetch: fetchMock, now: 2000 });

		expect(fetchMock).toHaveBeenCalledTimes(1);

		await fetchCachedManifest({
			config,
			fetch: fetchMock,
			now: 1000 + MANIFEST_DEDUPE_TTL_SECONDS * 1000 + 1,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('honours an explicit no-store by never reusing the response', async () => {
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		const fetchMock = vi.fn(async () =>
			manifestResponse({ 'cache-control': 'no-store' })
		);

		await fetchCachedManifest({ config, fetch: fetchMock, now: 1000 });
		await fetchCachedManifest({ config, fetch: fetchMock, now: 1001 });

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test('prefers the backend s-maxage over the dedupe floor', async () => {
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		const fetchMock = vi.fn(async () =>
			manifestResponse({ 'cache-control': 'public, s-maxage=60' })
		);

		await fetchCachedManifest({ config, fetch: fetchMock, now: 1000 });
		// Well past the dedupe floor, well inside s-maxage.
		await fetchCachedManifest({ config, fetch: fetchMock, now: 30_000 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('init route', () => {
	test.each([
		{ reason: 'transport', status: 'failed' },
		{ status: 'no-match' },
		{ status: 'unconfigured' },
	])(
		'clears stale proof after $status fallback resolution',
		async (resolution) => {
			mocks.serverFetch
				.mockResolvedValueOnce(new Response('missing', { status: 404 }))
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							branding: 'c15t',
							cmpId: 7,
							customVendors: [{ id: 'stale' }],
							gvl: { vendorListVersion: 1 },
							location: { countryCode: 'DE', regionCode: null },
							policy: { id: 'stale', model: 'iab' },
							policyDecision: { policyId: 'stale' },
							policyResolution: {
								policy: null,
								version: 1,
								...resolution,
							},
							policySnapshotToken: 'stale-token',
							subjectId: 'backend+literal',
							translations: { language: 'en', translations: {} },
						}),
						{ headers: { 'x-c15t-policy-contract': '1' } }
					)
				);
			const response = await callInitRoute({ 'x-c15t-policy-contract': '1' });
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
			expect(body.translations.language).toBe('en');
		}
	);

	test.each(['99', 'invalid', ''])(
		'rejects unsupported client declaration %s',
		async (contract) => {
			mocks.serverFetch.mockResolvedValue(manifestResponse({}));
			const response = await callInitRoute({
				'x-c15t-policy-contract': contract,
			});
			expect(await response.json()).toMatchObject({
				policyResolution: { reason: 'unsupported-contract', status: 'failed' },
			});
		}
	);

	test.each([
		{
			declaration: undefined,
			reason: 'unsupported-contract',
			status: 'failed',
		},
		{ declaration: '1', reason: 'invalid-payload', status: 'failed' },
		{ declaration: '99', reason: 'unsupported-contract', status: 'failed' },
		{
			declaration: 'invalid',
			reason: 'unsupported-contract',
			status: 'failed',
		},
	])(
		'negotiates fallback producer $declaration',
		async ({ declaration, status, reason }) => {
			const headers = new Headers();
			if (declaration !== undefined) {
				headers.set('x-c15t-policy-contract', declaration);
			}
			mocks.serverFetch
				.mockResolvedValueOnce(new Response('missing', { status: 404 }))
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							location: { countryCode: 'DE', regionCode: null },
							policy: { id: 'legacy', model: 'opt-in', ui: { mode: 'banner' } },
							translations: { language: 'en', translations: {} },
						}),
						{ headers }
					)
				);
			const response = await callInitRoute({ 'x-c15t-policy-contract': '1' });
			expect(response.headers.get('x-c15t-policy-contract')).toBe('1');
			const body = await response.json();
			expect(body.policyResolution.status).toBe(status);
			expect(body.policyResolution.reason).toBe(reason);
			expect(mocks.serverFetch).toHaveBeenLastCalledWith(
				'/api/self-host/init',
				expect.objectContaining({
					headers: expect.objectContaining({ 'x-c15t-policy-contract': '1' }),
				})
			);
		}
	);

	test('resolves geo locally from the manifest and never caches the answer', async () => {
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({ 'cache-control': 'public, s-maxage=120' })
		);

		const response = await callInitRoute({ 'x-c15t-country': 'DE' });

		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await response.json()).toMatchObject({
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE' },
			policyResolution: { policy: { id: 'eu-opt-in' }, status: 'matched' },
		});
		// Resolved from the manifest — no `/init` round trip to the backend.
		expect(mocks.serverFetch).toHaveBeenCalledTimes(1);
		expect(mocks.serverFetch.mock.calls[0]?.[0]).toContain('/manifest');
	});

	test('falls back to a proxied GET /init through serverFetch', async () => {
		// RFC 0001 §3: an older backend with no /manifest must not break consent.
		// The proxy has to go through serverFetch too, or a relative backendURL
		// throws ERR_INVALID_URL in Node.
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		mocks.serverFetch.mockImplementation(async (url: string) => {
			if (url.includes('/manifest')) {
				return new Response('nope', { status: 404 });
			}
			return new Response(
				JSON.stringify({
					jurisdiction: 'NONE',
					location: { countryCode: null, regionCode: null },
					translations: { language: 'en', translations: {} },
				}),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			);
		});

		const response = await callInitRoute({ 'x-c15t-country': 'DE' });

		expect(await response.json()).toMatchObject({ jurisdiction: 'NONE' });
		expect(mocks.serverFetch).toHaveBeenLastCalledWith(
			'/api/self-host/init',
			expect.objectContaining({
				headers: expect.objectContaining({ 'x-c15t-country': 'DE' }),
			})
		);
	});
});

describe('serverFetch', () => {
	test("delegates to nitro's localFetch so relative backendURLs resolve", async () => {
		// `globalThis.fetch` rejects relative URLs in Node; localFetch dispatches
		// them in-process and hands absolute URLs to real fetch.
		const serverFetch = createServerFetch(
			() =>
				({
					localFetch: mocks.localFetch,
				}) as never
		);
		mocks.localFetch.mockResolvedValue(new Response('ok'));

		await serverFetch('/api/self-host/manifest', { method: 'GET' });

		expect(mocks.localFetch).toHaveBeenCalledWith('/api/self-host/manifest', {
			method: 'GET',
		});
	});
});
