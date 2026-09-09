import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
/**
 * Tests for server-side utilities.
 *
 * Covers: extractRelevantHeaders, validateBackendURL, normalizeBackendURL, v3 prefetch helpers
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	prefetchInitialConsent,
	readInitialConsentConfig,
} from '../../lib/server';
import { extractRelevantHeaders } from '../../lib/server/headers';
import {
	normalizeBackendURL,
	validateBackendURL,
} from '../../lib/server/normalize-url';

// ─── extractRelevantHeaders ──────────────────────────────────────────────────

describe('extractRelevantHeaders', () => {
	test('returns empty object for empty headers', () => {
		const headers = new Headers();
		const result = extractRelevantHeaders(headers);
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('extracts only relevant headers, ignores others', () => {
		const headers = new Headers({
			authorization: 'Bearer token',
			'cf-ipcountry': 'DE',
			'content-type': 'application/json',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['cf-ipcountry']).toBe('DE');
		expect(result).not.toHaveProperty('content-type');
		expect(result).not.toHaveProperty('authorization');
	});

	test('country priority: cf-ipcountry wins over x-vercel-ip-country', () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
			'x-vercel-ip-country': 'US',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-country']).toBe('DE');
	});

	test('country priority: falls back to x-vercel-ip-country when cf-ipcountry absent', () => {
		const headers = new Headers({
			'x-vercel-ip-country': 'US',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-country']).toBe('US');
	});

	test('country priority: falls back to x-amz-cf-ipcountry', () => {
		const headers = new Headers({
			'x-amz-cf-ipcountry': 'FR',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-country']).toBe('FR');
	});

	test('country priority: falls back to x-country-code', () => {
		const headers = new Headers({
			'x-country-code': 'JP',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-country']).toBe('JP');
	});

	test('region priority: x-vercel-ip-country-region wins over x-region-code', () => {
		const headers = new Headers({
			'x-region-code': 'NY',
			'x-vercel-ip-country-region': 'CA',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-region']).toBe('CA');
	});

	test('region priority: falls back to x-region-code', () => {
		const headers = new Headers({
			'x-region-code': 'NY',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-region']).toBe('NY');
	});

	test('does not set x-c15t-country when no country headers present', () => {
		const headers = new Headers({
			'accept-language': 'en-US',
		});
		const result = extractRelevantHeaders(headers);
		expect(result).not.toHaveProperty('x-c15t-country');
	});

	test('extracts all relevant headers when present', () => {
		const headers = new Headers({
			'accept-language': 'de-DE',
			'cf-ipcountry': 'DE',
			'sec-gpc': '1',
			'user-agent': 'Mozilla/5.0',
			'x-forwarded-for': '1.2.3.4',
			'x-forwarded-host': 'example.com',
			'x-vercel-ip-country-region': 'BY',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['cf-ipcountry']).toBe('DE');
		expect(result['x-vercel-ip-country-region']).toBe('BY');
		expect(result['accept-language']).toBe('de-DE');
		expect(result['user-agent']).toBe('Mozilla/5.0');
		expect(result['x-forwarded-host']).toBe('example.com');
		expect(result['x-forwarded-for']).toBe('1.2.3.4');
		expect(result['sec-gpc']).toBe('1');
		expect(result['x-c15t-country']).toBe('DE');
		expect(result['x-c15t-region']).toBe('BY');
	});

	test('preserves explicit x-c15t override headers over infra headers', () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
			'cf-region-code': 'BY',
			'x-c15t-country': 'NL',
			'x-c15t-region': 'NH',
		});
		const result = extractRelevantHeaders(headers);
		expect(result['x-c15t-country']).toBe('NL');
		expect(result['x-c15t-region']).toBe('NH');
	});
});

// ─── validateBackendURL ──────────────────────────────────────────────────────

describe('validateBackendURL', () => {
	test('valid absolute URL', () => {
		const result = validateBackendURL('https://api.example.com/consent');
		expect(result.isAbsolute).toBe(true);
		expect(result.normalizedURL).toBe('https://api.example.com/consent');
	});

	test('absolute URL with trailing slash trimmed', () => {
		const result = validateBackendURL('https://api.example.com/consent/');
		expect(result.isAbsolute).toBe(true);
		expect(result.normalizedURL).toBe('https://api.example.com/consent');
	});

	test('invalid absolute URL throws', () => {
		expect(() => validateBackendURL('https://')).toThrow();
	});

	test('valid relative URL starting with /', () => {
		const result = validateBackendURL('/api/consent');
		expect(result.isAbsolute).toBe(false);
		expect(result.normalizedURL).toBe('/api/consent');
	});

	test('relative URL trailing slash trimmed', () => {
		const result = validateBackendURL('/api/consent/');
		expect(result.isAbsolute).toBe(false);
		expect(result.normalizedURL).toBe('/api/consent');
	});

	test('"/" stays as "/"', () => {
		const result = validateBackendURL('/');
		expect(result.isAbsolute).toBe(false);
		expect(result.normalizedURL).toBe('/');
	});

	test('URL without / or https:// throws', () => {
		expect(() => validateBackendURL('api/consent')).toThrow(
			/Invalid URL format/u
		);
	});

	test('http:// URLs also work', () => {
		const result = validateBackendURL('http://localhost:3000/api');
		expect(result.isAbsolute).toBe(true);
		expect(result.normalizedURL).toBe('http://localhost:3000/api');
	});
});

// ─── normalizeBackendURL ─────────────────────────────────────────────────────

describe('normalizeBackendURL', () => {
	test('absolute URL returned as-is', () => {
		const headers = new Headers();
		const result = normalizeBackendURL(
			'https://api.example.com/consent',
			headers
		);
		expect(result).toBe('https://api.example.com/consent');
	});

	test('relative URL resolved with x-forwarded-host and x-forwarded-proto', () => {
		const headers = new Headers({
			'x-forwarded-host': 'example.com',
			'x-forwarded-proto': 'https',
		});
		const result = normalizeBackendURL('/api/consent', headers);
		expect(result).toBe('https://example.com/api/consent');
	});

	test('relative URL resolved with host header (no x-forwarded-host)', () => {
		const headers = new Headers({
			host: 'example.com',
		});
		const result = normalizeBackendURL('/api/consent', headers);
		expect(result).toBe('https://example.com/api/consent');
	});

	test('defaults to https when no x-forwarded-proto', () => {
		const headers = new Headers({
			'x-forwarded-host': 'example.com',
		});
		const result = normalizeBackendURL('/api/consent', headers);
		expect(result).toBe('https://example.com/api/consent');
	});

	test('uses x-forwarded-proto when provided', () => {
		const headers = new Headers({
			'x-forwarded-host': 'example.com',
			'x-forwarded-proto': 'http',
		});
		const result = normalizeBackendURL('/api/consent', headers);
		expect(result).toBe('http://example.com/api/consent');
	});

	test('falls back to referer when no host headers', () => {
		const headers = new Headers({
			referer: 'https://mysite.com/page',
		});
		const result = normalizeBackendURL('/api/consent', headers);
		expect(result).toBe('https://mysite.com/api/consent');
	});

	test('returns null when cannot resolve relative URL', () => {
		const headers = new Headers();
		const result = normalizeBackendURL('/api/consent', headers);
		expect(result).toBeNull();
	});

	test('returns null for invalid URL format', () => {
		const headers = new Headers();
		const result = normalizeBackendURL('not-a-url', headers);
		expect(result).toBeNull();
	});

	test('trims trailing slash from resolved URL', () => {
		const headers = new Headers({
			'x-forwarded-host': 'example.com',
		});
		const result = normalizeBackendURL('/api/consent/', headers);
		expect(result).toBe('https://example.com/api/consent');
	});
});

// ─── v3 initial config / prefetch ───────────────────────────────────────────

describe('v3 server helpers', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		globalThis.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('readInitialConsentConfig returns empty records with a shared clock when no request context is present', async () => {
		const headers = new Headers({
			'content-type': 'application/json',
		});
		const result = await readInitialConsentConfig({
			headers,
		});
		expect(result.initialRecords?.choice).toBeNull();
		expect(result.initialRecords?.now).toBe(result.now);
		expect(result.initialPrivacySignals?.gpc).toBe(false);
	});

	test('readInitialConsentConfig reads geo, language, and consent cookie', async () => {
		// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
		const headers = new Headers({
			'cf-ipcountry': 'DE',
			'x-vercel-ip-country-region': 'BE',
			'accept-language': 'de-DE,de;q=0.9',
			// The persistence module's cookie — v2-compatible compact format.
			cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1234567890',
		});
		const result = await readInitialConsentConfig({
			headers,
		});

		expect(result.initialOverrides).toEqual({
			country: 'DE',
			language: 'de',
			region: 'BE',
		});
		expect(result.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
		expect(
			result.initialRecords?.choice?.categories.marketing?.confirmedAt
		).toBe(1234567890);
	});

	test('prefetchInitialConsent returns base config when URL normalization fails', async () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await prefetchInitialConsent({
			backendURL: '/api/consent',
			fetch: mockFetch,
			headers,
		});
		expect(result.initialOverrides?.country).toBe('DE');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('prefetchInitialConsent calls normalized URL /init', async () => {
		const initData = {
			branding: 'c15t',
			location: { countryCode: 'DE', regionCode: null },
		};
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		await prefetchInitialConsent({
			backendURL: 'https://api.example.com',
			fetch: mockFetch,
			headers,
		});

		expect(mockFetch).toHaveBeenCalledOnce();
		expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/init');
		expect(mockFetch.mock.calls[0][1].method).toBe('GET');
	});

	test('prefetchInitialConsent folds init response into KernelConfig', async () => {
		const initData = {
			branding: 'c15t',
			cmpId: 123,
			consents: { marketing: true },
			customVendors: [],
			gvl: { purposes: {}, specialFeatures: {}, stacks: {}, vendors: {} },
			location: { countryCode: 'DE', regionCode: null },
			policyResolution: writePolicyResolutionWire(
				resolvePolicyRules({
					countryCode: null,
					regionCode: null,
					rules: [
						{
							id: 'gdpr',
							match: { fallback: true },
							model: 'opt-in',
							prompt: 'choice',
						},
					],
				})
			),
			policySnapshotToken: 'token',
			translations: { language: 'en', translations: {} },
		};
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await prefetchInitialConsent({
			backendURL: 'https://api.example.com',
			fetch: mockFetch,
			headers,
		});

		expect(result.initialLocation).toEqual(initData.location);
		expect(result.initialTranslations).toEqual(initData.translations);
		expect(result.initialBranding).toBe('c15t');
		expect(result.initialPolicyResolution?.status).toBe('matched');
		expect(result.initialPolicySnapshotToken).toBe('token');
		expect(result.initialIab?.cmpId).toBe(123);
		expect(result.initialDraft).toBeUndefined();
		expect(result).not.toHaveProperty('initialHasConsented');
	});

	test('prefetchInitialConsent returns base config on non-OK response', async () => {
		mockFetch.mockResolvedValue(new Response('Not Found', { status: 404 }));

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await prefetchInitialConsent({
			backendURL: 'https://api.example.com',
			fetch: mockFetch,
			headers,
		});

		expect(result.initialOverrides?.country).toBe('DE');
		expect(result.initialPolicyResolution).toBeUndefined();
	});

	test('prefetchInitialConsent returns base config on fetch error', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await prefetchInitialConsent({
			backendURL: 'https://api.example.com',
			fetch: mockFetch,
			headers,
		});

		expect(result.initialOverrides?.country).toBe('DE');
		expect(result.initialPolicyResolution).toBeUndefined();
	});
});
