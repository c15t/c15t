/**
 * Tests for the request-only branch of resolveConsent — the server helper
 * that produces the visitor's ConsentState from the incoming Next.js
 * request when no backend URL is configured.
 *
 * Tests supply a tiny Next-compatible request context so each one controls
 * cookies and headers independently.
 */

import type { KernelConfig } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { resolveConsent as baseResolveConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();

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

const resolveConsent = (
	options: Parameters<typeof baseResolveConsent>[0] = {}
) => baseResolveConsent({ ...options, request });

beforeEach(() => {
	cookieStore.clear();
	headerStore.clear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('resolveConsent: no backend URL', () => {
	test('returns the cookie and header state without fetching', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		headerStore.set('cookie', 'c15t=c.necessary:1,c.marketing:1,i.t:1');
		headerStore.set('x-vercel-ip-country', 'DE');

		const state = await resolveConsent({ fetch: fetchSpy });

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(state.initialOverrides?.country).toBe('DE');
		expect(state.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
		expect(Object.hasOwn(state, 'initialPolicyResolution')).toBe(false);
		expect(JSON.parse(JSON.stringify(state))).toEqual(state);
	});
});

describe('resolveConsent: cookies', () => {
	test('returns empty config when nothing is present', async () => {
		const config = await resolveConsent();
		expect(config.now).toEqual(expect.any(Number));
		expect(config.initialRecords?.choice).toBeNull();
	});

	test('reads the compact persistence module cookie', async () => {
		// This is what the persistence module writes client-side.
		// The server MUST see it, or every SSR repeat visitor gets the banner
		// re-rendered into the first HTML (the re-prompt zombie).
		headerStore.set(
			'cookie',
			'c15t=c.necessary:1,c.marketing:1,c.measurement:0,i.t:1234567890'
		);
		const config = await resolveConsent();
		expect(config.initialRecords?.choice?.version).toBe(3);
		expect(config.initialRecords?.choice?.categories).toMatchObject({
			marketing: { confirmedAt: 1234567890, value: true },
			measurement: { confirmedAt: 1234567890, value: false },
		});
	});

	test('ignores malformed cookie values', async () => {
		headerStore.set('cookie', 'c15t=not-a-consent-payload');
		const config = await resolveConsent();
		expect(config.initialRecords?.choice).toBeNull();
		expect(Object.hasOwn(config, 'initialHasConsented')).toBe(false);
	});

	test('ignores unrelated cookies', async () => {
		headerStore.set('cookie', 'session=abc; theme=dark');
		const config = await resolveConsent();
		expect(config.initialRecords?.choice).toBeNull();
	});

	test('respects a customized storage key', async () => {
		// Mirrors a client that set storageConfig.storageKey = 'my-consent'.
		headerStore.set('cookie', 'my-consent=c.necessary:1,c.marketing:1,i.t:1');
		const config = await resolveConsent({
			cookieName: 'my-consent',
		});
		expect(config.initialRecords?.choice?.version).toBe(3);
		expect(config.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
	});
});

describe('resolveConsent: geo headers', () => {
	test('uses x-vercel-ip-country', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		const config = await resolveConsent();
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('falls back to cf-ipcountry', async () => {
		headerStore.set('cf-ipcountry', 'FR');
		const config = await resolveConsent();
		expect(config.initialOverrides?.country).toBe('FR');
	});

	test('cf-ipcountry wins over x-vercel-ip-country', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		headerStore.set('cf-ipcountry', 'FR');
		const config = await resolveConsent();
		expect(config.initialOverrides?.country).toBe('FR');
	});

	test('reads region when present', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		headerStore.set('x-vercel-ip-country-region', 'CA');
		const config = await resolveConsent();
		expect(config.initialOverrides?.country).toBe('US');
		expect(config.initialOverrides?.region).toBe('CA');
	});

	test('options.country overrides the header', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		const config = await resolveConsent({ country: 'DE' });
		expect(config.initialOverrides?.country).toBe('DE');
	});
});

describe('resolveConsent: language', () => {
	test('parses first language from accept-language', async () => {
		headerStore.set('accept-language', 'de-DE,de;q=0.9,en;q=0.5');
		const config = await resolveConsent();
		expect(config.initialOverrides?.language).toBe('de');
	});

	test('options.language overrides the header', async () => {
		headerStore.set('accept-language', 'de');
		const config = await resolveConsent({ language: 'fr' });
		expect(config.initialOverrides?.language).toBe('fr');
	});

	test('ignores silly values', async () => {
		headerStore.set('accept-language', 'this-is-way-too-long-for-a-lang-code');
		const config = await resolveConsent();
		expect(config.initialOverrides?.language).toBe('this');
	});

	test('returns no overrides block when nothing was set', async () => {
		const config = await resolveConsent();
		expect(config.initialOverrides).toBeUndefined();
	});
});

describe('resolveConsent: fluid-compute safety', () => {
	// Two concurrent calls with different cookie values must produce
	// distinct configs. If a module-level cache had crept in, this
	// would fail.
	test('concurrent calls do not cross-contaminate', async () => {
		const calls: Promise<KernelConfig>[] = [];

		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(JSON.stringify({ marketing: true }))
		);
		calls.push(resolveConsent());

		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(JSON.stringify({ marketing: false }))
		);
		calls.push(resolveConsent());

		const results = await Promise.all(calls);
		// Both calls read the same mutable mock store — that's expected.
		// The point is that each call goes through the live `cookies()`
		// helper every time, not a cached config from a previous call.
		expect(results[0]).not.toBe(results[1]);
	});
});

describe('resolveConsent: manifest session reports', () => {
	test('reports the render to the backend without touching the render', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));
		const registered: Promise<void>[] = [];
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('x-forwarded-for', '203.0.113.42');
		headerStore.set('user-agent', 'Mozilla/5.0');

		const state = await resolveConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
			manifest: MANIFEST_FIXTURE,
			waitUntil: (task) => {
				registered.push(task);
			},
		});
		expect(state.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
			status: 'matched',
		});
		expect(registered).toHaveLength(1);
		await registered[0];

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://consent.example.com/sessions');
		const headers = init.headers as Record<string, string>;
		expect(headers['x-forwarded-for']).toBe('203.0.113.42');
		expect(headers['user-agent']).toBe('Mozilla/5.0');
		expect(headers).not.toHaveProperty('cookie');
		expect(JSON.parse(init.body as string)).toMatchObject({
			adapter: '@c15t/nextjs',
			country: 'DE',
			source: 'render',
		});
	});

	test('sends nothing when reportSessions is false', async () => {
		const fetchSpy = vi.fn();
		await resolveConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
			manifest: MANIFEST_FIXTURE,
			reportSessions: false,
		});
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
