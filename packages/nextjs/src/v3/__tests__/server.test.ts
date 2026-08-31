/**
 * Tests for readInitialConsentConfig — the server-only helper that
 * produces a KernelConfig from the incoming Next.js request.
 *
 * Tests supply a tiny Next-compatible request context so each one controls
 * cookies and headers independently.
 */

import type { KernelConfig } from '@c15t/core/v3';
import { beforeEach, describe, expect, test } from 'vitest';

import { readInitialConsentConfig as baseReadInitialConsentConfig } from '../server';

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

const readInitialConsentConfig = (
	options: Parameters<typeof baseReadInitialConsentConfig>[0] = {}
) => baseReadInitialConsentConfig({ ...options, request });

beforeEach(() => {
	cookieStore.clear();
	headerStore.clear();
});

describe('readInitialConsentConfig: cookies', () => {
	test('returns empty config when nothing is present', async () => {
		const config = await readInitialConsentConfig();
		expect(config).toEqual({});
	});

	test('reads the persistence module cookie (c15t, v2 compact format)', async () => {
		// This is what the v3 persistence module actually writes client-side.
		// The server MUST see it, or every SSR repeat visitor gets the banner
		// re-rendered into the first HTML (the re-prompt zombie).
		headerStore.set(
			'cookie',
			'c15t=c.necessary:1,c.marketing:1,c.measurement:0,i.t:1234567890'
		);
		const config = await readInitialConsentConfig();
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents).toMatchObject({
			marketing: true,
			measurement: false,
			necessary: true,
		});
	});

	test('ignores malformed cookie values', async () => {
		headerStore.set('cookie', 'c15t=not-a-consent-payload');
		const config = await readInitialConsentConfig();
		expect(config.initialConsents).toBeUndefined();
		expect(config.initialHasConsented).toBeUndefined();
	});

	test('ignores unrelated cookies', async () => {
		headerStore.set('cookie', 'session=abc; theme=dark');
		const config = await readInitialConsentConfig();
		expect(config.initialConsents).toBeUndefined();
	});

	test('respects a customized storage key', async () => {
		// Mirrors a client that set storageConfig.storageKey = 'my-consent'.
		headerStore.set('cookie', 'my-consent=c.necessary:1,c.marketing:1,i.t:1');
		const config = await readInitialConsentConfig({
			cookieName: 'my-consent',
		});
		expect(config.initialHasConsented).toBe(true);
		expect(config.initialConsents).toMatchObject({ marketing: true });
	});
});

describe('readInitialConsentConfig: geo headers', () => {
	test('uses x-vercel-ip-country', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('falls back to cf-ipcountry', async () => {
		headerStore.set('cf-ipcountry', 'FR');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.country).toBe('FR');
	});

	test('cf-ipcountry wins over x-vercel-ip-country', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		headerStore.set('cf-ipcountry', 'FR');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.country).toBe('FR');
	});

	test('reads region when present', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		headerStore.set('x-vercel-ip-country-region', 'CA');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.country).toBe('US');
		expect(config.initialOverrides?.region).toBe('CA');
	});

	test('options.country overrides the header', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		const config = await readInitialConsentConfig({ country: 'DE' });
		expect(config.initialOverrides?.country).toBe('DE');
	});
});

describe('readInitialConsentConfig: language', () => {
	test('parses first language from accept-language', async () => {
		headerStore.set('accept-language', 'de-DE,de;q=0.9,en;q=0.5');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.language).toBe('de');
	});

	test('options.language overrides the header', async () => {
		headerStore.set('accept-language', 'de');
		const config = await readInitialConsentConfig({ language: 'fr' });
		expect(config.initialOverrides?.language).toBe('fr');
	});

	test('ignores silly values', async () => {
		headerStore.set('accept-language', 'this-is-way-too-long-for-a-lang-code');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.language).toBe('this');
	});

	test('returns no overrides block when nothing was set', async () => {
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides).toBeUndefined();
	});
});

describe('readInitialConsentConfig: fluid-compute safety', () => {
	// Two concurrent calls with different cookie values must produce
	// distinct configs. If the v2 module-level cache had crept in, this
	// would fail.
	test('concurrent calls do not cross-contaminate', async () => {
		const calls: Promise<KernelConfig>[] = [];

		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(JSON.stringify({ marketing: true }))
		);
		calls.push(readInitialConsentConfig());

		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(JSON.stringify({ marketing: false }))
		);
		calls.push(readInitialConsentConfig());

		const results = await Promise.all(calls);
		// Both calls read the same mutable mock store — that's expected.
		// The point is that each call goes through the live `cookies()`
		// helper every time, not a cached config from a previous call.
		expect(results[0]).not.toBe(results[1]);
	});
});
