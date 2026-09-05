import { createManifestCache } from '@c15t/core/transports/manifest-cache';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createConsentServerRoute } from '../api';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const createManifestFetch = function createManifestFetch(
	headers: Record<string, string> = {
		'cache-control': 'public, s-maxage=120, stale-while-revalidate=60',
		'content-language': 'en',
		etag: '"manifest-revision"',
	}
) {
	return vi
		.fn()
		.mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify(MANIFEST_FIXTURE), { headers, status: 200 })
			)
		);
};

const createRoute = function createRoute(
	options: Omit<Parameters<typeof createConsentServerRoute>[0], 'cache'> = {}
) {
	return createConsentServerRoute({ ...options, cache: createManifestCache() });
};

const request = function request(
	path: string,
	headers: Record<string, string> = {}
) {
	return new Request(`https://app.example.com${path}`, { headers });
};

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('createConsentServerRoute: splat dispatch', () => {
	test('routes the init splat to the init handler', async () => {
		const { GET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
		});

		const response = await GET({
			params: { _splat: 'init' },
			request: request('/api/c15t/init', {
				'accept-language': 'de-DE,de;q=0.9',
				'sec-gpc': '1',
				'x-vercel-ip-country': 'DE',
				'x-vercel-ip-country-region': 'BE',
			}),
		});

		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = await response.json();
		expect(body.location).toEqual({ countryCode: 'DE', regionCode: 'BE' });
		expect(body.translations.language).toBe('de');
		expect(body.policyDecision).toMatchObject({
			country: 'DE',
			fingerprint: 'eu-fingerprint',
			policyId: 'eu-opt-in',
		});
		expect(body.resolvedOverrides).toMatchObject({ country: 'DE', gpc: true });
	});

	test('routes the manifest splat to the manifest handler', async () => {
		const { GET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
		});

		const response = await GET({
			params: { _splat: 'manifest' },
			request: request('/api/c15t/manifest'),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(MANIFEST_FIXTURE);
	});

	test('falls back to the request path when params are absent', async () => {
		const { GET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
		});

		const response = await GET({ request: request('/api/c15t/manifest/') });
		expect(response.status).toBe(200);
	});

	test('returns 404 for unknown splats', async () => {
		const fetchSpy = createManifestFetch();
		const { GET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		const response = await GET({
			params: { _splat: 'subjects' },
			request: request('/api/c15t/subjects'),
		});

		expect(response.status).toBe(404);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe('createConsentServerRoute: manifest passthrough', () => {
	test('forwards backend cache headers and the language query', async () => {
		const fetchSpy = createManifestFetch();
		const { manifestGET } = createRoute({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: 'https://consent.example.com/manifest',
		});

		const response = await manifestGET({
			request: request('/api/c15t/manifest?language=de'),
		});

		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/manifest?language=de'
		);
		expect(response.headers.get('content-type')).toBe('application/json');
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=120, stale-while-revalidate=60'
		);
		expect(response.headers.get('etag')).toBe('"manifest-revision"');
		expect(response.headers.get('content-language')).toBe('en');
	});

	test('answers 304 to a matching if-none-match', async () => {
		const { manifestGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
		});

		const response = await manifestGET({
			request: request('/api/c15t/manifest', {
				'if-none-match': '"manifest-revision"',
			}),
		});

		expect(response.status).toBe(304);
		expect(response.headers.get('etag')).toBe('"manifest-revision"');
	});

	test('serves repeat requests from the in-process cache', async () => {
		const fetchSpy = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await manifestGET({ request: request('/api/c15t/manifest') });
		await manifestGET({ request: request('/api/c15t/manifest') });

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});

describe('createConsentServerRoute: backend resolution', () => {
	test('relative backendURL resolves from forwarded headers when trusted', async () => {
		const fetchSpy = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: '/consent',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			trustForwardedHeaders: true,
		});

		await manifestGET({
			request: request('/api/c15t/manifest', {
				'x-forwarded-host': 'edge.example.com',
				'x-forwarded-proto': 'https',
			}),
		});

		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://edge.example.com/consent/manifest'
		);
	});

	test('reads C15T_BACKEND_URL then VITE_C15T_BACKEND_URL', async () => {
		vi.stubEnv('VITE_C15T_BACKEND_URL', 'https://vite.example.com');
		const fetchSpy = createManifestFetch();
		const { manifestGET } = createRoute({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await manifestGET({ request: request('/api/c15t/manifest') });
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://vite.example.com/manifest'
		);

		vi.stubEnv('C15T_BACKEND_URL', 'https://env.example.com');
		await manifestGET({ request: request('/api/c15t/manifest') });
		expect(fetchSpy.mock.calls[1]?.[0]).toBe(
			'https://env.example.com/manifest'
		);
	});

	test('rejects requests without any backend configuration', async () => {
		const { initGET } = createRoute();
		await expect(
			initGET({ request: request('/api/c15t/init') })
		).rejects.toThrow(/configure backendURL/u);
	});
});

describe('createConsentServerRoute: GVL', () => {
	test('fetches the GVL only when the manifest enables IAB', async () => {
		const fetchGvl = vi.fn().mockResolvedValue({ vendors: {} });
		const { initGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
			fetchGvl,
		});

		await initGET({
			request: request('/api/c15t/init', { 'x-vercel-ip-country': 'DE' }),
		});

		expect(fetchGvl).not.toHaveBeenCalled();
	});
});

describe('createConsentServerRoute: GVL and forwarded hosts', () => {
	test('fetches the GVL for the resolved language when the manifest enables IAB', async () => {
		const fetchGvl = vi
			.fn()
			.mockResolvedValue({ vendors: { '1': { name: 'Vendor' } } });
		const iabManifest = {
			...MANIFEST_FIXTURE,
			iab: {
				enabled: true,
				gvl: { url: 'https://gvl.example/vendor-list.json' },
			},
			policyPacks: undefined,
		};
		const fetch = vi.fn().mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify(iabManifest), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			)
		);
		const { initGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetch as unknown as typeof globalThis.fetch,
			fetchGvl,
		});

		const response = await initGET({
			request: request('/api/c15t/init', {
				'accept-language': 'de-DE,de;q=0.9',
			}),
		});
		const payload = (await response.json()) as { gvl?: unknown };

		expect(fetchGvl).toHaveBeenCalledWith(
			expect.objectContaining({
				language: 'de',
				reference: { url: 'https://gvl.example/vendor-list.json' },
			})
		);
		expect(payload.gvl).toEqual({ vendors: { '1': { name: 'Vendor' } } });
	});

	test('resolves a relative backendURL against request.url, not a forged x-forwarded-host', async () => {
		const fetch = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: '/consent-backend',
			fetch: fetch as unknown as typeof globalThis.fetch,
		});
		await manifestGET({
			request: request('/api/c15t/manifest', {
				'x-forwarded-host': 'evil.example',
			}),
		});
		expect(fetch.mock.calls[0]?.[0]).toBe(
			'https://app.example.com/consent-backend/manifest'
		);
	});
});

describe('createConsentServerRoute: proxy credentials on the manifest fetch', () => {
	test('forwards named cookies and extra headers when the manifest is gated', async () => {
		const fetch = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetch as unknown as typeof globalThis.fetch,
			proxy: { cookieNames: ['c15t'], forwardHeaders: ['authorization'] },
		});
		await manifestGET({
			request: request('/api/c15t/manifest', {
				authorization: 'Bearer tenant',
				cookie: 'session=secret; c15t=abc',
			}),
		});
		const headers = new Headers(
			(fetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers
		);
		expect(headers.get('cookie')).toBe('c15t=abc');
		expect(headers.get('authorization')).toBe('Bearer tenant');
	});

	test('sends no credentials without the proxy', async () => {
		const fetch = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetch as unknown as typeof globalThis.fetch,
		});
		await manifestGET({
			request: request('/api/c15t/manifest', { cookie: 'c15t=abc' }),
		});
		const headers = new Headers(
			(fetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers
		);
		expect(headers.get('cookie')).toBeNull();
	});
});

describe('createConsentServerRoute: manifest cache keys and credentialed responses', () => {
	test('canonicalises the language query and drops implausible values', async () => {
		for (const [raw, expected] of [
			['DE-de', 'language=de-de'],
			['fr', 'language=fr'],
			['<script>', undefined],
			['a'.repeat(40), undefined],
		] as const) {
			const fetch = createManifestFetch();
			const { manifestGET } = createRoute({
				backendURL: 'https://consent.example.com',
				fetch: fetch as unknown as typeof globalThis.fetch,
			});
			// oxlint-disable-next-line no-await-in-loop -- sequential cases keep the failing value readable.
			await manifestGET({
				request: request(
					`/api/c15t/manifest?language=${encodeURIComponent(raw)}`
				),
			});
			const url = new URL(fetch.mock.calls[0]?.[0] as string);
			expect(url.search ? url.search.slice(1) : undefined, raw).toBe(expected);
		}
	});

	test('marks a credentialed manifest response private and strips validators', async () => {
		const fetch = createManifestFetch({
			'cache-control': 'public, s-maxage=120',
			etag: '"rev"',
		});
		const { manifestGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetch as unknown as typeof globalThis.fetch,
			proxy: { cookieNames: ['c15t'] },
		});
		const response = await manifestGET({
			request: request('/api/c15t/manifest', { cookie: 'c15t=abc' }),
		});
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('etag')).toBeNull();

		const anonymous = await manifestGET({
			request: request('/api/c15t/manifest'),
		});
		expect(anonymous.headers.get('cache-control')).toBe('public, s-maxage=120');
	});
});

describe('createConsentServerRoute: forwarding headers on the manifest fetch', () => {
	test('never copies client x-forwarded-* onto the upstream manifest request', async () => {
		const fetch = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: 'https://consent.example.com',
			fetch: fetch as unknown as typeof globalThis.fetch,
			proxy: {
				forwardHeaders: [
					'x-forwarded-host',
					'x-forwarded-for',
					'x-forwarded-proto',
				],
			},
		});
		await manifestGET({
			request: request('/api/c15t/manifest', {
				'x-forwarded-for': '203.0.113.7',
				'x-forwarded-host': 'evil.example',
				'x-forwarded-proto': 'http',
			}),
		});
		const headers = new Headers(
			(fetch.mock.calls[0] as [string, RequestInit])[1].headers
		);
		expect(headers.get('x-forwarded-host')).toBeNull();
		expect(headers.get('x-forwarded-for')).toBeNull();
		expect(headers.get('x-forwarded-proto')).toBeNull();
	});
});

describe('createConsentServerRoute: cleartext manifest source', () => {
	test('drops caller-configured identity headers before the manifest fetch', async () => {
		const fetch = createManifestFetch();
		const { manifestGET } = createRoute({
			backendURL: 'http://backend.example',
			fetch: fetch as unknown as typeof globalThis.fetch,
			proxy: { forwardHeaders: ['x-api-key', 'accept-language'] },
		});
		const response = await manifestGET({
			request: request('/api/c15t/manifest', {
				'accept-language': 'de',
				'x-api-key': 'tenant-a',
			}),
		});
		expect(response.status).toBe(200);
		const headers = new Headers(
			(fetch.mock.calls[0] as [string, RequestInit])[1].headers
		);
		expect(headers.get('x-api-key')).toBeNull();
		expect(headers.get('accept-language')).toBe('de');
	});
});
