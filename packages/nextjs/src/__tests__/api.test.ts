import { clearGvlCache } from '@c15t/core';
import { clearManifestCache } from '@c15t/core/libs/manifest-cache';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	createManifestFetchInit,
	createNextConsentRouteHandlers,
	getSMaxAge,
} from '../api';
import { defineConsentConfig } from '../config';
import { MANIFEST_FIXTURE } from './manifest-fixture';

describe('@c15t/nextjs/api', () => {
	beforeEach(() => {
		clearManifestCache();
		clearGvlCache();
	});

	test('manifestGET hands a background revalidation to onBackgroundRevalidate', async () => {
		vi.useFakeTimers();
		try {
			const fetchSpy = vi.fn().mockResolvedValue(
				new Response(JSON.stringify(MANIFEST_FIXTURE), {
					headers: {
						'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
						etag: '"manifest-revision"',
					},
					status: 200,
				})
			);
			const registered: Promise<void>[] = [];
			const { manifestGET } = createNextConsentRouteHandlers({
				backendURL: 'https://consent.example.com/api/c15t',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				onBackgroundRevalidate: (refresh) => {
					registered.push(refresh);
				},
			});
			const request = new Request('https://app.example.com/api/c15t/manifest');

			await manifestGET(request);
			expect(registered).toHaveLength(0);

			// Past s-maxage, inside the stale window: served from memory and the
			// refresh is handed to the host.
			vi.advanceTimersByTime(1500);
			const stale = await manifestGET(request);
			expect(stale.status).toBe(200);
			expect(registered).toHaveLength(1);
			await expect(registered[0]).resolves.toBeUndefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	test('GET extracts geo, language, and GPC headers for local init', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: {
					'cache-control': 'public, s-maxage=120, stale-while-revalidate=60',
					etag: '"manifest-revision"',
				},
				status: 200,
			})
		);
		const { GET } = createNextConsentRouteHandlers({
			backendURL: 'https://consent.example.com/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestRevalidateSeconds: 120,
		});

		const response = await GET(
			new Request('https://app.example.com/api/c15t/init', {
				headers: {
					'accept-language': 'de-DE,de;q=0.9',
					'sec-gpc': '1',
					'x-vercel-ip-country': 'DE',
					'x-vercel-ip-country-region': 'BE',
				},
			})
		);

		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://consent.example.com/api/c15t/manifest',
			expect.objectContaining({
				next: { revalidate: 120 },
			})
		);

		const body = await response.json();
		expect(body.location).toEqual({ countryCode: 'DE', regionCode: 'BE' });
		expect(body.translations.language).toBe('de');
		expect(body.policyResolution).toMatchObject({
			fingerprints: MANIFEST_FIXTURE.policyPacks[0].fingerprints,
			policyId: 'eu-opt-in',
			status: 'matched',
		});
	});

	test('GET reports the resolved session to the backend, detached', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(MANIFEST_FIXTURE)));
		const registered: Promise<void>[] = [];
		const { GET } = createNextConsentRouteHandlers({
			backendURL: 'https://consent.example.com/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			onBackgroundRevalidate: (task) => {
				registered.push(task);
			},
		});

		const response = await GET(
			new Request('https://app.example.com/api/c15t/init', {
				headers: {
					cookie: 'c15t=secret',
					'user-agent': 'Mozilla/5.0',
					// `sec-gpc` is a forbidden header in this browser-mode suite;
					// the adapter header the extractor reads first stands in.
					'x-c15t-gpc': '1',
					'x-forwarded-for': '203.0.113.42',
					'x-vercel-ip-country': 'DE',
				},
			})
		);
		expect(response.status).toBe(200);
		expect(registered).toHaveLength(1);
		await registered[0];

		const report = fetchSpy.mock.calls.find(
			([url]) => url === 'https://consent.example.com/api/c15t/sessions'
		);
		expect(report).toBeDefined();
		const init = report?.[1] as RequestInit;
		expect(init.method).toBe('POST');
		const headers = init.headers as Record<string, string>;
		// `user-agent` is a forbidden request header in this browser-mode
		// suite, so only the IP chain can be asserted here.
		expect(headers['x-forwarded-for']).toBe('203.0.113.42');
		expect(headers).not.toHaveProperty('cookie');
		expect(JSON.parse(init.body as string)).toMatchObject({
			adapter: '@c15t/nextjs',
			country: 'DE',
			gpc: true,
			policy: { id: 'eu-opt-in' },
			revision: 'manifest-revision',
			source: 'route',
		});
	});

	test('GET sends no session report when reportSessions is false', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(MANIFEST_FIXTURE)));
		const { GET } = createNextConsentRouteHandlers({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			reportSessions: false,
		});
		await GET(new Request('https://app.example.com/api/c15t/init'));
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/manifest'
		);
	});

	test('manifestGET mirrors backend cache headers', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: {
					'cache-control': 'public, s-maxage=90, stale-while-revalidate=45',
					etag: '"manifest-revision"',
				},
				status: 200,
			})
		);
		const { manifestGET } = createNextConsentRouteHandlers({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestRevalidateSeconds: 90,
			manifestURL: 'https://consent.example.com/manifest',
		});

		const response = await manifestGET(
			new Request('https://app.example.com/api/c15t/manifest?language=de')
		);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://consent.example.com/manifest?language=de',
			expect.objectContaining({
				next: { revalidate: 90 },
			})
		);
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=90, stale-while-revalidate=45'
		);
		expect(response.headers.get('etag')).toBe('"manifest-revision"');
		expect(response.headers.get('x-c15t-next-revalidate')).toBe('90');
	});

	test('relative backendURL resolves from forwarded headers before request URL host', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: {
					'cache-control': 'public, s-maxage=120',
				},
				status: 200,
			})
		);
		const { manifestGET } = createNextConsentRouteHandlers({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await manifestGET(
			new Request('https://app.example.com/api/c15t/manifest', {
				headers: {
					'x-forwarded-host': 'edge.example.com',
					'x-forwarded-proto': 'https',
				},
			})
		);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://edge.example.com/api/c15t/manifest',
			expect.any(Object)
		);
	});

	test('declares the response contract and rejects unsupported client contracts', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(MANIFEST_FIXTURE)));
		const { GET } = createNextConsentRouteHandlers({
			backendURL: 'https://consent.example.com',
			fetch,
		});
		const response = await GET(
			new Request('https://example.com/api/c15t/init', {
				headers: { 'x-c15t-country': 'DE', 'x-c15t-policy-contract': '99' },
			})
		);
		expect(response.headers.get('x-c15t-policy-contract')).toBe('1');
		expect(await response.json()).toMatchObject({
			policyResolution: { reason: 'unsupported-contract', status: 'failed' },
		});
		expect(fetch.mock.calls[0]?.[1].headers['x-c15t-policy-contract']).toBe(
			'1'
		);
	});

	test('cache helpers expose s-maxage and Next fetch config', () => {
		expect(getSMaxAge('public, s-maxage=240, stale-while-revalidate=60')).toBe(
			240
		);
		expect(
			createManifestFetchInit({ manifestRevalidateSeconds: 15 }).next
		).toEqual({ revalidate: 15 });
	});

	test('manifestGET serves repeat requests from the in-process cache', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: {
					'cache-control': 'public, s-maxage=300',
					etag: '"manifest-revision"',
				},
				status: 200,
			})
		);
		const { manifestGET } = createNextConsentRouteHandlers({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: 'https://consent.example.com/manifest',
		});
		const request = new Request('https://app.example.com/api/c15t/manifest');

		const first = await manifestGET(request);
		const second = await manifestGET(request);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(await second.json()).toEqual(await first.json());
		expect(second.headers.get('etag')).toBe('"manifest-revision"');
	});

	test('manifestGET does not cache a private backend response', async () => {
		const fetchSpy = vi.fn().mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify(MANIFEST_FIXTURE), {
					headers: { 'cache-control': 'private, no-store' },
					status: 200,
				})
			)
		);
		const { manifestGET } = createNextConsentRouteHandlers({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: 'https://consent.example.com/manifest',
		});
		const request = new Request('https://app.example.com/api/c15t/manifest');

		await manifestGET(request);
		await manifestGET(request);

		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	test('a defineConsentConfig result supplies backendURL and ignores its same-origin routes', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: { 'cache-control': 'public, s-maxage=120' },
				status: 200,
			})
		);
		const config = defineConsentConfig({
			backendURL: 'https://consent.example.com/api/c15t',
			initURL: '/api/consent/init',
			manifestURL: '/api/consent/manifest',
		});
		const { GET, manifestGET } = createNextConsentRouteHandlers({
			...config,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		await manifestGET(
			new Request('https://app.example.com/api/consent/manifest')
		);
		const response = await GET(
			new Request('https://app.example.com/api/consent/init', {
				headers: { 'x-vercel-ip-country': 'DE' },
			})
		);

		// Both routes read the backend manifest, never the config's own
		// same-origin `manifestURL`, which these handlers serve. The init
		// route's session report goes to the same backend.
		const reads = fetchSpy.mock.calls.filter(
			([url]) => !String(url).endsWith('/sessions')
		);
		expect(reads).toHaveLength(1);
		for (const [url] of reads) {
			expect(url).toBe('https://consent.example.com/api/c15t/manifest');
		}
		const body = await response.json();
		expect(body.policyResolution).toMatchObject({ policyId: 'eu-opt-in' });
	});
});

test.each([
	['s-maxage=60junk', undefined],
	['s-maxage=1e2', undefined],
	['s-maxage=1.5', undefined],
	['s-maxage=0', 0],
	['s-maxage=60', 60],
])('parses whole cache lifetimes: %s', (header, expected) => {
	expect(getSMaxAge(header as string)).toBe(expected);
});

test('reuses the GVL between IAB init requests', async () => {
	clearGvlCache();
	clearManifestCache();
	const gvlURL = 'https://gvl.test/next-list';
	const manifest = {
		...MANIFEST_FIXTURE,
		iab: { enabled: true, gvl: { url: gvlURL } },
		policyPacks: [
			createConsentManifestPolicyPack({
				id: 'iab',
				match: { fallback: true },
				model: 'iab',
				prompt: 'choice',
			}),
		],
	};
	const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((url) =>
		Promise.resolve(
			Response.json(
				url === gvlURL
					? { purposes: {}, vendorListVersion: 12, vendors: {} }
					: manifest,
				{
					headers: { 'cache-control': 'public, max-age=3600, s-maxage=3600' },
				}
			)
		)
	);
	const { GET } = createNextConsentRouteHandlers({
		fetch,
		manifestURL: 'https://api.test/next-manifest',
	});
	const request = new Request('https://app.test/api/c15t/init');
	expect((await (await GET(request)).json()).gvlReference).toMatchObject({
		vendorListVersion: 12,
	});
	expect((await (await GET(request)).json()).gvlReference).toMatchObject({
		vendorListVersion: 12,
	});
	expect(fetch.mock.calls.filter(([url]) => url === gvlURL)).toHaveLength(1);
	clearGvlCache();
});

afterEach(() => vi.restoreAllMocks());

test('manifestGET forwards upstream age and time spent in the local cache', async () => {
	clearManifestCache();
	const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
	const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
		Promise.resolve(
			Response.json(MANIFEST_FIXTURE, {
				headers: { age: '55', 'cache-control': 's-maxage=60' },
			})
		)
	);
	const { manifestGET } = createNextConsentRouteHandlers({
		fetch,
		manifestURL: 'https://age.example/manifest',
	});
	const request = new Request('https://app.example/api/manifest');
	const first = await manifestGET(request);
	expect(first.headers.get('age')).toBe('55');
	clock.mockReturnValue(2000);
	const second = await manifestGET(request);
	expect(second.headers.get('age')).toBe('57');
	expect(second.headers.get('cache-control')).toBe('s-maxage=60');
	expect(fetch).toHaveBeenCalledTimes(1);
});
