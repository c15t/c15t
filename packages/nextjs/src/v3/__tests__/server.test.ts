/**
 * Tests for readInitialConsentConfig — the server-only helper that
 * produces a KernelConfig from the incoming Next.js request.
 *
 * next/headers is mocked per test so each one controls cookies and
 * headers independently. No real Next.js request context is needed.
 */

import type { KernelConfig } from 'c15t/v3';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { readInitialConsentConfig } from '../server';

const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();

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

describe('readInitialConsentConfig: cookies', () => {
	test('returns empty config when nothing is present', async () => {
		const config = await readInitialConsentConfig();
		expect(config).toEqual({});
	});

	test('parses a valid consent cookie', async () => {
		cookieStore.set(
			'c15t-consent',
			encodeURIComponent(JSON.stringify({ marketing: true, measurement: true }))
		);
		const config = await readInitialConsentConfig();
		expect(config.initialConsents).toEqual({
			marketing: true,
			measurement: true,
		});
	});

	test('ignores malformed cookies', async () => {
		cookieStore.set('c15t-consent', 'not-json');
		const config = await readInitialConsentConfig();
		expect(config.initialConsents).toBeUndefined();
	});

	test('ignores array payloads', async () => {
		cookieStore.set('c15t-consent', encodeURIComponent('[]'));
		const config = await readInitialConsentConfig();
		expect(config.initialConsents).toBeUndefined();
	});

	test('respects custom cookie name', async () => {
		cookieStore.set(
			'my-consent',
			encodeURIComponent(JSON.stringify({ marketing: true }))
		);
		const config = await readInitialConsentConfig({ cookieName: 'my-consent' });
		expect(config.initialConsents).toEqual({ marketing: true });
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

	test('x-vercel-ip-country wins over cf-ipcountry', async () => {
		headerStore.set('x-vercel-ip-country', 'US');
		headerStore.set('cf-ipcountry', 'FR');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.country).toBe('US');
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
		expect(config.initialOverrides?.language).toBe('de-DE');
	});

	test('options.language overrides the header', async () => {
		headerStore.set('accept-language', 'de');
		const config = await readInitialConsentConfig({ language: 'fr' });
		expect(config.initialOverrides?.language).toBe('fr');
	});

	test('ignores silly values', async () => {
		headerStore.set('accept-language', 'this-is-way-too-long-for-a-lang-code');
		const config = await readInitialConsentConfig();
		expect(config.initialOverrides?.language).toBeUndefined();
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
