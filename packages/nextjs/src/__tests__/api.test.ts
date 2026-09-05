import { clearManifestCache } from '@c15t/core/libs/manifest-cache';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
		expect(body.policyDecision).toMatchObject({
			country: 'DE',
			fingerprint: 'eu-fingerprint',
			policyId: 'eu-opt-in',
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
		// same-origin `manifestURL`, which these handlers serve.
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		for (const [url] of fetchSpy.mock.calls) {
			expect(url).toBe('https://consent.example.com/api/c15t/manifest');
		}
		const body = await response.json();
		expect(body.policyDecision).toMatchObject({ policyId: 'eu-opt-in' });
	});
});
