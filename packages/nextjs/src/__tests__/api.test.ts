import { describe, expect, test, vi } from 'vitest';

import {
	createManifestFetchInit,
	createNextConsentRouteHandlers,
	getSMaxAge,
} from '../api';
import { MANIFEST_FIXTURE } from './manifest-fixture';

describe('@c15t/nextjs/api', () => {
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
});
