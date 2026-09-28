/**
 * Tests for resolveConsent with a backendURL: the server-side helper then
 * resolves init from the cached manifest and folds it into the ConsentState
 * handed to the client `ConsentRoot`.
 */
import { clearGvlCache } from '@c15t/core';
import { createManifestCache } from '@c15t/core/transports/manifest-cache';
import {
	buildConsentManifestFromConfig,
	policyRulePresets,
} from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import {
	createConsentStateHandler,
	resolveConsent as baseResolveConsent,
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

const resolveConsent = (
	options: Omit<
		NonNullable<Parameters<typeof baseResolveConsent>[0]>,
		'request' | 'cache'
	>,
	request = createRequest()
) =>
	baseResolveConsent({
		// These tests count manifest fetches; the session report the render
		// also sends is covered in server.test.ts.
		reportSessions: false,
		...options,
		cache: createManifestCache(),
		request,
	});

describe('resolveConsent: manifest resolution', () => {
	test('resolves init locally from the backend manifest', async () => {
		const fetchSpy = createManifestFetch();
		const state = await resolveConsent(
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
		expect(state.initialPolicyResolution?.policy?.id).toBe('eu-opt-in');
		expect(state.initialPolicyResolution).toMatchObject({
			fingerprints: MANIFEST_FIXTURE.policyPacks[0]?.fingerprints,
			status: 'matched',
		});
		expect(state.initialTranslations?.language).toBe('de');
		expect(state.initialOverrides).toMatchObject({
			country: 'DE',
			language: 'de',
		});
	});

	test('uses an inline manifest without touching the network', async () => {
		const fetchSpy = createManifestFetch();
		const state = await resolveConsent(
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
		expect(state.initialPolicyResolution?.policy?.id).toBe('us-ca-opt-out');
	});

	test('keeps persisted cookie consent alongside the resolved policy', async () => {
		const state = await resolveConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
			},
			createRequest({
				cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1',
				'x-vercel-ip-country': 'DE',
			})
		);

		expect(!!state.initialRecords?.choice).toBe(true);
		expect(state.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
		expect(state.initialPolicyResolution?.policy?.id).toBe('eu-opt-in');
	});

	test('resolves a relative backendURL from forwarded headers when trusted', async () => {
		const fetchSpy = createManifestFetch();
		await resolveConsent(
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

describe('resolveConsent: degradation', () => {
	test("never fetches the app's own consent route during SSR", async () => {
		const fetchSpy = createManifestFetch();
		const state = await resolveConsent(
			{
				backendURL: '/api/c15t',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({ 'x-vercel-ip-country': 'DE' })
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(state.initialPolicyResolution).toBeUndefined();
		expect(state.initialOverrides?.country).toBe('DE');
	});

	test('createConsentStateHandler with the proxied route prefix falls back silently', async () => {
		// With `createConsentServerRoute({ proxy: true })` the browser gets
		// `backendURL="/api/c15t"`. Handing that same value to the server
		// function must not turn into a self-fetch; it degrades to the
		// cookie-and-headers state without throwing or logging.
		const fetchSpy = createManifestFetch();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const handler = createConsentStateHandler({
				backendURL: '/api/c15t',
				cache: createManifestCache(),
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				request: createRequest({
					cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1',
				}),
			});
			const state = await handler();

			expect(fetchSpy).not.toHaveBeenCalled();
			expect(!!state.initialRecords?.choice).toBe(true);
			expect(state.initialPolicyResolution).toBeUndefined();
			expect(warn).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
			error.mockRestore();
		}
	});

	test('returns the cookie-and-headers state when the manifest fetch fails', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response('nope', { status: 503 }));
		const state = await resolveConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
			},
			createRequest({ 'x-vercel-ip-country': 'DE' })
		);

		expect(state).toMatchObject({ initialOverrides: { country: 'DE' } });
	});

	test('returns the cookie-and-headers state when fetch throws', async () => {
		const fetchSpy = vi.fn().mockRejectedValue(new Error('offline'));
		const state = await resolveConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(state).toMatchObject({
			initialRecords: { choice: null, subject: null },
			now: expect.any(Number),
		});
	});
});

describe('createConsentStateHandler', () => {
	test('prefetches when a backendURL is configured', async () => {
		const handler = createConsentStateHandler({
			backendURL: 'https://consent.example.com',
			cache: createManifestCache(),
			fetch: createManifestFetch() as unknown as typeof globalThis.fetch,
			request: createRequest({ 'x-vercel-ip-country': 'DE' }),
		});

		const state = await handler();
		expect(state.initialPolicyResolution?.policy?.id).toBe('eu-opt-in');
	});

	test('only reads the request without a backendURL', async () => {
		const handler = createConsentStateHandler({
			request: createRequest({ 'x-vercel-ip-country': 'DE' }),
		});

		expect(await handler()).toMatchObject({
			initialOverrides: { country: 'DE' },
		});
	});
});

describe('resolveConsent: header forwarding', () => {
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
		await resolveConsent(
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
		await resolveConsent(
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
		await resolveConsent(
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

describe('resolveConsent: cookie cannot bypass cookieNames', () => {
	test('forwardHeaders listing cookie forwards nothing without cookieNames', async () => {
		const fetchSpy = createManifestFetch();
		await resolveConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				forwardHeaders: ['cookie'],
			},
			createRequest({ cookie: 'session=secret; c15t=abc' })
		);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const call = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(new Headers(call[1].headers).get('cookie')).toBeNull();
	});
});

describe('resolveConsent: forwarding headers', () => {
	test('never copies client x-forwarded-* onto the manifest fetch', async () => {
		const fetchSpy = createManifestFetch();
		await resolveConsent(
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				forwardHeaders: [
					'x-forwarded-host',
					'x-forwarded-for',
					'x-forwarded-proto',
				],
			},
			createRequest({
				'x-forwarded-for': '203.0.113.7',
				'x-forwarded-host': 'evil.example',
				'x-forwarded-proto': 'http',
			})
		);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const call = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = new Headers(call[1].headers);
		expect(headers.get('x-forwarded-host')).toBeNull();
		expect(headers.get('x-forwarded-for')).toBeNull();
		expect(headers.get('x-forwarded-proto')).toBeNull();
	});
});

describe('resolveConsent: cleartext backend', () => {
	test('drops caller-configured identity headers before the manifest fetch', async () => {
		const fetchSpy = createManifestFetch();
		await resolveConsent(
			{
				backendURL: 'http://backend.example',
				fetch: fetchSpy as unknown as typeof globalThis.fetch,
				forwardHeaders: ['x-api-key', 'accept-language'],
			},
			createRequest({ 'accept-language': 'de', 'x-api-key': 'tenant-a' })
		);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const call = fetchSpy.mock.calls[0] as [string, RequestInit];
		const headers = new Headers(call[1].headers);
		expect(headers.get('x-api-key')).toBeNull();
		expect(headers.get('accept-language')).toBe('de');
	});
});

test.each(['direct', 'proxy', 'custom-fetch', 'forwarded'] as const)(
	'resolves IAB vendor loading for the %s TanStack setup',
	async (setup) => {
		clearGvlCache();
		const manifest = await buildConsentManifestFromConfig({
			branding: 'c15t',
			iab: { cmpId: 28, enabled: true },
			policyRules: [policyRulePresets.europeIab()],
		});
		const fetch = vi.fn(() => Promise.resolve(Response.json(completeGVL)));
		vi.stubGlobal('fetch', fetch);
		try {
			const state = await resolveConsent(
				{
					backendURL: 'https://consent.example.com',
					fetch: setup === 'custom-fetch' ? fetch : undefined,
					forwardHeaders: setup === 'forwarded' ? ['x-tenant'] : undefined,
					manifest,
					routePrefix: setup === 'direct' ? undefined : '/privacy',
				},
				createRequest({ 'x-c15t-country': 'DE', 'x-tenant': 'private' })
			);
			const reference = state.initialIab?.gvlReference;
			const expectedURL = {
				'custom-fetch': undefined,
				direct: manifest.iab?.gvl?.url,
				forwarded: undefined,
				proxy: `/privacy/init?c15t-gvl=${completeGVL.vendorListVersion}&language=en`,
			}[setup];
			expect(reference?.url).toBe(expectedURL);
			expect(state.initialIab?.gvl).toEqual(
				setup === 'direct' || setup === 'proxy' ? null : completeGVL
			);
			expect(fetch).toHaveBeenCalledOnce();
		} finally {
			vi.unstubAllGlobals();
			clearGvlCache();
		}
	}
);

describe('resolveConsent: slow or failing backend', () => {
	test('renders the cookie-and-headers state when the manifest misses the budget, then uses it', async () => {
		const cache = createManifestCache();
		let answer: (() => void) | undefined;
		const fetchSpy = vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					answer = () =>
						resolve(
							new Response(JSON.stringify(MANIFEST_FIXTURE), {
								headers: { 'cache-control': 'public, s-maxage=120' },
								status: 200,
							})
						);
				})
		);
		const background: Promise<void>[] = [];
		const options = {
			backendURL: 'https://consent.example.com',
			cache,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			onBackgroundRevalidate: (task: Promise<void>) => {
				background.push(task);
			},
			reportSessions: false,
			request: createRequest({ 'x-vercel-ip-country': 'DE' }),
			timeoutMs: 20,
		};

		const first = await baseResolveConsent(options);
		expect(first.initialPolicyResolution).toBeUndefined();
		expect(background).toHaveLength(1);
		answer?.();
		await background[0];

		const second = await baseResolveConsent(options);
		expect(second.initialPolicyResolution?.status).toBe('matched');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test('after a failed manifest, later renders wait out the retry floor', async () => {
		const cache = createManifestCache();
		const fetchSpy = vi.fn(() =>
			Promise.resolve(new Response('unavailable', { status: 503 }))
		);
		const options = {
			backendURL: 'https://consent.example.com',
			cache,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			reportSessions: false,
			request: createRequest(),
		};
		for (let index = 0; index < 5; index += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential renders by design.
			const state = await baseResolveConsent(options);
			expect(state.initialPolicyResolution).toBeUndefined();
		}
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});
