/**
 * Tests for server-side utilities.
 *
 * Covers: extractRelevantHeaders, validateBackendURL, normalizeBackendURL, fetchSSRData
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchSSRData } from '../fetch-ssr-data';
import { extractRelevantHeaders } from '../headers';
import { normalizeBackendURL, validateBackendURL } from '../normalize-url';

// ─── extractRelevantHeaders ──────────────────────────────────────────────────

describe('extractRelevantHeaders', () => {
	test('returns empty object for empty headers', () => {
		const headers = new Headers();
		const result = extractRelevantHeaders(headers);
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('extracts only relevant headers, ignores others', () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
			'content-type': 'application/json',
			authorization: 'Bearer token',
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
			'x-vercel-ip-country-region': 'CA',
			'x-region-code': 'NY',
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
			'cf-ipcountry': 'DE',
			'x-vercel-ip-country-region': 'BY',
			'accept-language': 'de-DE',
			'user-agent': 'Mozilla/5.0',
			'x-forwarded-host': 'example.com',
			'x-forwarded-for': '1.2.3.4',
			'sec-gpc': '1',
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
			/Invalid URL format/
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

// ─── fetchSSRData ────────────────────────────────────────────────────────────

describe('fetchSSRData', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		globalThis.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('returns undefined when no relevant headers found', async () => {
		const headers = new Headers({
			'content-type': 'application/json',
		});
		const result = await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
		});
		expect(result).toBeUndefined();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('returns undefined when URL normalization fails', async () => {
		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		// Relative URL with no host headers = can't normalize
		const result = await fetchSSRData({
			backendURL: '/api/consent',
			headers,
		});
		expect(result).toBeUndefined();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('makes fetch call to normalized URL /init', async () => {
		const initData = {
			showConsentBanner: true,
			jurisdiction: { code: 'GDPR' },
		};
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
		});

		expect(mockFetch).toHaveBeenCalledOnce();
		expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/init');
	});

	test('returns { init, gvl } on successful response', async () => {
		const initData = {
			showConsentBanner: true,
			jurisdiction: { code: 'GDPR' },
			gvl: { vendors: {} },
		};
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
		});

		expect(result).toBeDefined();
		expect(result?.init).toEqual(initData);
		expect(result?.gvl).toEqual({ vendors: {} });
	});

	test('returns undefined on non-OK response', async () => {
		mockFetch.mockResolvedValue(new Response('Not Found', { status: 404 }));

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
		});

		expect(result).toBeUndefined();
	});

	test('returns undefined on fetch error/network failure', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		const result = await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
		});

		expect(result).toBeUndefined();
	});

	test('applies country override header', async () => {
		const initData = { showConsentBanner: true };
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
			overrides: { country: 'US' },
		});

		const fetchHeaders = mockFetch.mock.calls[0][1].headers;
		expect(fetchHeaders['x-c15t-country']).toBe('US');
	});

	test('applies region override header', async () => {
		const initData = { showConsentBanner: true };
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
			overrides: { region: 'CA' },
		});

		const fetchHeaders = mockFetch.mock.calls[0][1].headers;
		expect(fetchHeaders['x-c15t-region']).toBe('CA');
	});

	test('applies language override header', async () => {
		const initData = { showConsentBanner: true };
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify(initData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const headers = new Headers({
			'cf-ipcountry': 'DE',
		});
		await fetchSSRData({
			backendURL: 'https://api.example.com',
			headers,
			overrides: { language: 'fr-FR' },
		});

		const fetchHeaders = mockFetch.mock.calls[0][1].headers;
		expect(fetchHeaders['accept-language']).toBe('fr-FR');
	});
});
