/**
 * Tests for prefetchInitialConsent, the server-side helper that resolves
 * init from the cached manifest and folds it into the KernelConfig handed
 * to the client `ConsentBoundary`.
 */
import { createManifestCache } from '@c15t/core/transports/manifest-cache';
import { describe, expect, test, vi } from 'vitest';

import {
	createConsentConfigHandler,
	prefetchInitialConsent as basePrefetchInitialConsent,
} from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const createRequest = function createRequest(
	headers: Record<string, string> = {},
	url = 'https://app.example.com/'
) {
	return new Request(url, { headers });
};

const createManifestFetch = function createManifestFetch() {
	return vi.fn().mockImplementation(() =>
		Promise.resolve(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: {
					'cache-control': 'public, s-maxage=120',
					'content-type': 'application/json',
					etag: '"manifest-revision"',
				},
				status: 200,
			})
		)
	);
};

const prefetchInitialConsent = (
	options: Omit<
		Parameters<typeof basePrefetchInitialConsent>[0],
		'request' | 'cache'
	>,
	request = createRequest()
) =>
	basePrefetchInitialConsent({
		...options,
		cache: createManifestCache(),
		request,
	});

describe('prefetchInitialConsent: manifest resolution', () => {
	test('resolves init locally from the backend manifest', async () => {
		const fetchSpy = createManifestFetch();
		const config = await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({
				'accept-language': 'de-DE,de;q=0.9',
				'x-vercel-ip-country': 'DE',
			})
		);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/manifest'
		);
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
		expect(config.initialPolicyDecision).toMatchObject({
			country: 'DE',
			fingerprint: 'eu-fingerprint',
		});
		expect(config.initialTranslations?.language).toBe('de');
		expect(config.initialOverrides).toMatchObject({
			country: 'DE',
			language: 'de',
		});
	});

	test('uses an inline manifest without touching the network', async () => {
		const fetchSpy = createManifestFetch();
		const config = await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				manifest: MANIFEST_FIXTURE,
			},
			createRequest({
				'x-vercel-ip-country': 'US',
				'x-vercel-ip-country-region': 'CA',
			})
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(config.initialPolicy?.id).toBe('us-ca-opt-out');
	});

	test('keeps persisted cookie consent alongside the resolved policy', async () => {
		const config = await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
			},
			createRequest({
				cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1',
				'x-vercel-ip-country': 'DE',
			})
		);

		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents).toMatchObject({ marketing: true });
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
	});

	test('resolves a relative backendURL from forwarded headers when trusted', async () => {
		const fetchSpy = createManifestFetch();
		await prefetchInitialConsent(
			{
				backendURL: '/consent',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				trustForwardedHeaders: true,
			},
			createRequest({
				'x-forwarded-host': 'edge.example.com',
				'x-forwarded-proto': 'https',
			})
		);

		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://edge.example.com/consent/manifest'
		);
	});
});

describe('prefetchInitialConsent: degradation', () => {
	test("never fetches the app's own consent route during SSR", async () => {
		const fetchSpy = createManifestFetch();
		const config = await prefetchInitialConsent(
			{
				backendURL: '/api/c15t',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({ 'x-vercel-ip-country': 'DE' })
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(config.initialPolicy).toBeUndefined();
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('createConsentConfigHandler with the proxied route prefix falls back silently', async () => {
		// With `createConsentServerRoute({ proxy: true })` the browser gets
		// `backendURL="/api/c15t"`. Handing that same value to the server
		// function must not turn into a self-fetch; it degrades to the
		// cookie-and-headers config without throwing or logging.
		const fetchSpy = createManifestFetch();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const handler = createConsentConfigHandler({
				backendURL: '/api/c15t',
				cache: createManifestCache(),
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				request: createRequest({
					cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1',
				}),
			});
			const config = await handler();

			expect(fetchSpy).not.toHaveBeenCalled();
			expect(config.initialHasConsented).toBe(true);
			expect(config.initialPolicy).toBeUndefined();
			expect(warn).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
			error.mockRestore();
		}
	});

	test('returns the baseline config when the manifest fetch fails', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response('nope', { status: 503 }));
		const config = await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({ 'x-vercel-ip-country': 'DE' })
		);

		expect(config).toEqual({ initialOverrides: { country: 'DE' } });
	});

	test('returns the baseline config when fetch throws', async () => {
		const fetchSpy = vi.fn().mockRejectedValue(new Error('offline'));
		const config = await prefetchInitialConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(config).toEqual({});
	});
});

describe('createConsentConfigHandler', () => {
	test('prefetches when a backendURL is configured', async () => {
		const handler = createConsentConfigHandler({
			backendURL: 'https://consent.example.com',
			cache: createManifestCache(),
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
			request: createRequest({ 'x-vercel-ip-country': 'DE' }),
		});

		const config = await handler();
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
	});

	test('only reads the request without a backendURL', async () => {
		const handler = createConsentConfigHandler({
			request: createRequest({ 'x-vercel-ip-country': 'DE' }),
		});

		expect(await handler()).toEqual({ initialOverrides: { country: 'DE' } });
	});
});

describe('prefetchInitialConsent: header forwarding', () => {
	const manifestCall = function manifestCall(
		fetchSpy: ReturnType<typeof vi.fn>
	) {
		const call = fetchSpy.mock.calls[0] as [string, RequestInit] | undefined;
		if (!call) {
			throw new Error('manifest was not fetched');
		}
		return { headers: new Headers(call[1].headers), url: call[0] };
	};

	test('forwards named headers but no cookies on the manifest fetch by default', async () => {
		const fetchSpy = createManifestFetch();
		await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				forwardHeaders: ['authorization'],
			},
			createRequest({
				authorization: 'Bearer token',
				cookie: 'session=secret; c15t=abc',
			})
		);
		const { headers, url } = manifestCall(fetchSpy);
		expect(url).toBe('https://consent.example.com/manifest');
		expect(headers.get('authorization')).toBe('Bearer token');
		expect(headers.get('cookie')).toBeNull();
	});

	test('never resolves a relative backendURL against a forged forwarded host', async () => {
		const fetchSpy = createManifestFetch();
		await prefetchInitialConsent(
			{
				backendURL: '/consent-backend',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({ 'x-forwarded-host': 'evil.example' })
		);
		expect(manifestCall(fetchSpy).url).toBe(
			'https://app.example.com/consent-backend/manifest'
		);
	});

	test('scopes forwarded cookies with cookieNames', async () => {
		const fetchSpy = createManifestFetch();
		await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				cookieNames: ['c15t'],
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({ cookie: 'session=secret; c15t=abc' })
		);
		expect(manifestCall(fetchSpy).headers.get('cookie')).toBe('c15t=abc');
	});
});

describe('prefetchInitialConsent: cookie cannot bypass cookieNames', () => {
	test('forwardHeaders listing cookie forwards nothing without cookieNames', async () => {
		const fetchSpy = createManifestFetch();
		await prefetchInitialConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				forwardHeaders: ['cookie'],
			},
			createRequest({ cookie: 'session=secret; c15t=abc' })
		);
		const call = fetchSpy.mock.calls[0] as [string, RequestInit] | undefined;
		expect(new Headers(call?.[1].headers).get('cookie')).toBeNull();
	});
});
