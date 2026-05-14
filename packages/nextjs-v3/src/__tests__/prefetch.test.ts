/**
 * Tests for prefetchInitialConsent — the server-side helper that calls
 * the backend's /init, folds the response into KernelConfig, and hands
 * it to the client `ConsentBoundary` for first-paint accurate rendering.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { prefetchInitialConsent } from '../server';

const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();
const POLICY = {
	id: 'gdpr',
	model: 'opt-in',
	ui: { mode: 'banner' },
};

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
	test('calls ${backendURL}/init with current context', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		cookieStore.set('sess', 'abc');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					policy: POLICY,
					policySnapshotToken: 'snap-1',
					location: { countryCode: 'DE', regionCode: null },
					translations: { language: 'de', translations: {} },
					branding: 'c15t',
					gvl: null,
					customVendors: [],
					cmpId: 28,
				}),
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

		const body = JSON.parse((init as RequestInit).body as string);
		expect(body.overrides).toEqual({ country: 'DE' });

		// Cookies are forwarded.
		const headers = (init as RequestInit).headers as Record<string, string>;
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
			.mockResolvedValue(new Response('{}', { status: 200 }));
		await prefetchInitialConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://consent.example.com/init');
	});

	test('failed backend call returns baseline config (silent degradation)', async () => {
		headerStore.set('cf-ipcountry', 'US');
		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(JSON.stringify({ marketing: true }))
		);

		const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		// Baseline from cookie + header is preserved.
		expect(config.initialOverrides?.country).toBe('US');
		expect(config.initialConsents?.marketing).toBe(true);
		// Init response missing; fields stay undefined.
		expect(config.initialPolicy).toBeUndefined();
		expect(config.initialPolicySnapshotToken).toBeUndefined();
	});

	test('server-returned consents merge with cookie consents', async () => {
		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(
				JSON.stringify({ marketing: true, measurement: false })
			)
		);

		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(
					JSON.stringify({ consents: { measurement: true, experience: true } }),
					{ status: 200, headers: { 'content-type': 'application/json' } }
				)
			);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		// Cookie marketing=true preserved (server didn't send marketing).
		// Server measurement=true overrides cookie measurement=false.
		// Server experience=true added.
		expect(config.initialConsents).toMatchObject({
			marketing: true,
			measurement: true,
			experience: true,
		});
	});

	test('resolvedOverrides from server merge into overrides', async () => {
		headerStore.set('accept-language', 'de');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					resolvedOverrides: { country: 'DE', region: 'BE' },
				}),
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
			.mockResolvedValue(new Response('{}', { status: 200 }));

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
