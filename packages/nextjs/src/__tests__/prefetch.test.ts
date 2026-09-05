/**
 * Tests for prefetchInitialConsent, the server-side helper that calls
 * the backend's /init, folds the response into KernelConfig, and hands
 * it to the client `ConsentBoundary` for first-paint accurate rendering.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { defineConsentConfig } from '../config';
import { prefetchInitialConsent as basePrefetchInitialConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();
const POLICY = {
	id: 'gdpr',
	model: 'opt-in',
	ui: { mode: 'banner' },
};

const createCookieHeader = () =>
	Array.from(cookieStore.entries())
		.map(([key, value]) => `${key}=${value}`)
		.join('; ');

const createHeaders = () => {
	const headers = new Headers(Array.from(headerStore.entries()));
	const cookieHeader = createCookieHeader();
	if (cookieHeader && !headers.has('cookie')) {
		headers.set('cookie', cookieHeader);
	}
	return headers;
};

const createInitOutput = function createInitOutput(
	overrides: Record<string, unknown> = {}
) {
	return {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: { countryCode: null, regionCode: null },
		translations: { language: 'en', translations: { common: {} } },
		...overrides,
	};
};

const request = {
	cookies: () =>
		Promise.resolve({
			get: (name: string) => {
				const value = cookieStore.get(name);
				return value === undefined ? undefined : { name, value };
			},
			toString: createCookieHeader,
		}),
	headers: () => Promise.resolve(createHeaders()),
};

const prefetchInitialConsent = (
	options: Omit<Parameters<typeof basePrefetchInitialConsent>[0], 'request'>
) => basePrefetchInitialConsent({ ...options, request });

beforeEach(() => {
	cookieStore.clear();
	headerStore.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('prefetchInitialConsent: backend call', () => {
	test('calls backendURL/init with current context', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		cookieStore.set('sess', 'abc');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						branding: 'c15t',
						cmpId: 28,
						customVendors: [],
						gvl: null,
						location: { countryCode: 'DE', regionCode: null },
						policy: POLICY,
						policySnapshotToken: 'snap-1',
						translations: { language: 'de', translations: {} },
					})
				),
				{ headers: { 'content-type': 'application/json' }, status: 200 }
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/c15t/init');

		const headers = (init as RequestInit).headers as Record<string, string>;
		expect((init as RequestInit).method).toBe('GET');
		expect(headers['x-c15t-country']).toBe('DE');

		// Cookies are forwarded.
		expect(headers.cookie).toContain('sess=abc');

		// Response was merged into config.
		expect(config.initialPolicy).toEqual(POLICY);
		expect(config.initialPolicySnapshotToken).toBe('snap-1');
		expect(config.initialLocation).toEqual({
			countryCode: 'DE',
			regionCode: null,
		});
		expect(config.initialTranslations?.language).toBe('de');
		expect(config.initialBranding).toBe('c15t');
		expect(config.initialIab).toMatchObject({
			cmpId: 28,
			customVendors: [],
			enabled: false,
			gvl: null,
		});
	});

	test('absolute backendURL bypasses host resolution', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(createInitOutput()), { status: 200 })
			);
		await prefetchInitialConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://consent.example.com/init');
	});

	test('failed backend call returns baseline config', async () => {
		headerStore.set('cf-ipcountry', 'US');
		headerStore.set('cookie', 'c15t=c.necessary:1,c.marketing:1,i.t:1');

		const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			onError: () => undefined,
		});

		// Baseline from cookie + header is preserved.
		expect(config.initialOverrides?.country).toBe('US');
		expect(config.initialConsents?.marketing).toBe(true);
		expect(config.initialHasConsented).toBe(true);
		// Init response missing; fields stay undefined.
		expect(config.initialPolicy).toBeUndefined();
		expect(config.initialPolicySnapshotToken).toBeUndefined();
	});

	test('server-returned consents merge with cookie consents', async () => {
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		headerStore.set(
			'cookie',
			'c15t=c.necessary:1,c.marketing:1,c.measurement:0,i.t:1'
		);

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						consents: {
							functionality: true,
							marketing: false,
						},
					})
				),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		// /init consent preferences overlay cookie state, and a consent-bearing
		// init response marks the user as consented for first paint.
		expect(config.initialConsents).toMatchObject({
			functionality: true,
			marketing: false,
			measurement: false,
		});
		expect(config.initialHasConsented).toBe(true);
	});

	test('resolvedOverrides from server merge into overrides', async () => {
		headerStore.set('accept-language', 'de');
		headerStore.set('host', 'app.example.com');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						location: { countryCode: 'DE', regionCode: 'BE' },
						translations: { language: 'de', translations: {} },
					})
				),
				{ headers: { 'content-type': 'application/json' }, status: 200 }
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(config.initialOverrides).toEqual({
			country: 'DE',
			language: 'de',
			region: 'BE',
		});
	});

	test('forwardHeaders forwards requested request-headers', async () => {
		headerStore.set('authorization', 'Bearer token-xyz');
		headerStore.set('x-trace-id', 'trace-1');
		headerStore.set('host', 'app.example.com');

		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(createInitOutput()), { status: 200 })
			);

		await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			forwardHeaders: ['authorization', 'x-trace-id'],
		});

		const [, init] = fetchSpy.mock.calls[0] ?? [];
		const headers = (init as RequestInit).headers as Record<string, string>;
		expect(headers.authorization).toBe('Bearer token-xyz');
		expect(headers['x-trace-id']).toBe('trace-1');
	});
});

describe('prefetchInitialConsent: manifest mode', () => {
	test('resolves init from manifestURL without calling /init', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('accept-language', 'de-DE,de;q=0.9');
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: '/api/c15t/manifest',
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/c15t/manifest');
		expect(String(url)).not.toContain('/init');
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
		expect(config.initialPolicyDecision).toMatchObject({
			country: 'DE',
			policyId: 'eu-opt-in',
		});
		expect(config.initialTranslations?.language).toBe('de');
	});

	test('inline manifest keeps the prefetch request path backend-free', async () => {
		headerStore.set('cf-ipcountry', 'US');
		headerStore.set('x-region-code', 'CA');

		const fetchSpy = vi.fn();

		const config = await prefetchInitialConsent({
			backendURL: 'https://consent.example.com/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifest: MANIFEST_FIXTURE,
		});

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(config.initialPolicy?.id).toBe('us-ca-opt-out');
		expect(config.initialLocation).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});
});

describe('prefetchInitialConsent: config', () => {
	test('config supplies backendURL and manifestURL', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);

		const config = await prefetchInitialConsent({
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
				initURL: '/api/consent/init',
				manifestURL: '/api/consent/manifest',
			}),
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://app.example.com/api/consent/manifest'
		);
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
	});

	test('explicit fields override the config', async () => {
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(createInitOutput()), { status: 200 })
			);

		await prefetchInitialConsent({
			backendURL: 'https://other.example.com',
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
				manifestURL: '/api/consent/manifest',
			}),
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: '/custom/manifest',
		});

		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://app.example.com/custom/manifest'
		);
	});

	test('a config without manifestURL falls back to the backend /init', async () => {
		headerStore.set('host', 'app.example.com');
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(createInitOutput()), { status: 200 })
			);

		await prefetchInitialConsent({
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
			}),
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(fetchSpy.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/init'
		);
	});

	test('throws when neither backendURL nor config is given', async () => {
		await expect(
			prefetchInitialConsent({ fetch: vi.fn() as unknown as typeof fetch })
		).rejects.toThrow('`backendURL` or a `config`');
	});
});

describe('prefetchInitialConsent: error reporting', () => {
	test('onError receives the failure and nothing is logged', async () => {
		headerStore.set('host', 'app.example.com');
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const failure = new Error('network down');
		const onError = vi.fn();

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: vi.fn().mockRejectedValue(failure) as unknown as typeof fetch,
			onError,
		});

		expect(config).toEqual({});
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(failure);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	test('warns with the init URL and the error message when onError is absent', async () => {
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: vi
				.fn()
				.mockRejectedValue(
					new Error('network down')
				) as unknown as typeof fetch,
		});

		expect(config).toEqual({});
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const [message] = warnSpy.mock.calls[0] ?? [];
		expect(message).toContain('https://app.example.com/api/c15t/init');
		expect(message).toContain('network down');
		expect(String(message)).not.toContain('\n');
	});

	test('warns with the manifest URL in manifest mode', async () => {
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: vi
				.fn()
				.mockRejectedValue(
					new Error('manifest down')
				) as unknown as typeof fetch,
			manifestURL: '/api/consent/manifest',
		});

		expect(warnSpy).toHaveBeenCalledTimes(1);
		const [message] = warnSpy.mock.calls[0] ?? [];
		expect(message).toContain('https://app.example.com/api/consent/manifest');
		expect(message).toContain('manifest down');
	});

	test('non-2xx init responses are reported too', async () => {
		headerStore.set('host', 'app.example.com');
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: vi
				.fn()
				.mockResolvedValue(
					new Response('nope', { status: 503, statusText: 'Unavailable' })
				) as unknown as typeof fetch,
		});

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]?.[0]).toContain('503');
	});

	test('stays quiet in production', async () => {
		headerStore.set('host', 'app.example.com');
		vi.stubGlobal('process', { env: { NODE_ENV: 'production' } });
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: vi
				.fn()
				.mockRejectedValue(
					new Error('network down')
				) as unknown as typeof fetch,
		});

		expect(config).toEqual({});
		expect(warnSpy).not.toHaveBeenCalled();
	});
});
