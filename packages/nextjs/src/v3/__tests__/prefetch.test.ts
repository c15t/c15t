/**
 * Tests for prefetchInitialConsent — the server-side helper that calls
 * the backend's /init, folds the response into KernelConfig, and hands
 * it to the client `ConsentBoundary` for first-paint accurate rendering.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { prefetchInitialConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();
const POLICY = {
	id: 'gdpr',
	model: 'opt-in',
	ui: { mode: 'banner' },
};

function createInitOutput(overrides: Record<string, unknown> = {}) {
	return {
		jurisdiction: 'GDPR',
		location: { countryCode: null, regionCode: null },
		translations: { language: 'en', translations: { common: {} } },
		branding: 'c15t',
		...overrides,
	};
}

vi.mock('next/headers', () => ({
	cookies: () =>
		Promise.resolve({
			get: (name: string) => {
				const value = cookieStore.get(name);
				return value === undefined ? undefined : { name, value };
			},
			toString: () =>
				Array.from(cookieStore.entries())
					.map(([k, v]) => `${k}=${v}`)
					.join('; '),
		}),
	headers: () =>
		Promise.resolve({
			get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
		}),
}));

beforeEach(() => {
	cookieStore.clear();
	headerStore.clear();
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
						policy: POLICY,
						policySnapshotToken: 'snap-1',
						location: { countryCode: 'DE', regionCode: null },
						translations: { language: 'de', translations: {} },
						branding: 'c15t',
						gvl: null,
						customVendors: [],
						cmpId: 28,
					})
				),
				{ status: 200, headers: { 'content-type': 'application/json' } }
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
			enabled: false,
			gvl: null,
			customVendors: [],
			cmpId: 28,
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

	test('failed backend call returns baseline config (silent degradation)', async () => {
		headerStore.set('cf-ipcountry', 'US');
		headerStore.set('cookie', 'c15t=c.necessary:1,c.marketing:1,i.t:1');

		const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
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
							marketing: false,
							functionality: true,
						},
					})
				),
				{
					status: 200,
					headers: { 'content-type': 'application/json' },
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
			marketing: false,
			measurement: false,
			functionality: true,
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
				{ status: 200, headers: { 'content-type': 'application/json' } }
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(config.initialOverrides).toEqual({
			language: 'de',
			country: 'DE',
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
				status: 200,
				headers: { 'content-type': 'application/json' },
			})
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			manifestURL: '/api/c15t/manifest',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/c15t/manifest');
		expect(String(url)).not.toContain('/init');
		expect(config.initialPolicy?.id).toBe('eu-opt-in');
		expect(config.initialPolicyDecision).toMatchObject({
			policyId: 'eu-opt-in',
			country: 'DE',
		});
		expect(config.initialTranslations?.language).toBe('de');
	});

	test('inline manifest keeps the prefetch request path backend-free', async () => {
		headerStore.set('cf-ipcountry', 'US');
		headerStore.set('x-region-code', 'CA');

		const fetchSpy = vi.fn();

		const config = await prefetchInitialConsent({
			backendURL: 'https://consent.example.com/api/c15t',
			manifest: MANIFEST_FIXTURE,
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(config.initialPolicy?.id).toBe('us-ca-opt-out');
		expect(config.initialLocation).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});
});
