import { describe, expect, it } from 'vitest';

import { normalizeBackendURL, validateBackendURL } from './normalize-url';

describe('validateBackendURL', () => {
	it('should validate absolute URLs correctly', () => {
		const validAbsoluteURLs = [
			'http://example.com',
			'https://example.com',
			'http://localhost:3000',
			'https://api.example.com/path',
		];

		for (const url of validAbsoluteURLs) {
			const result = validateBackendURL(url);
			expect(result.isAbsolute).toBe(true);
			expect(result.normalizedURL).toBe(url);
		}
	});

	it('should trim trailing slashes from absolute URLs', () => {
		const testCases = [
			{
				expected: 'https://my-instance.c15t.dev',
				input: 'https://my-instance.c15t.dev/',
			},
			{ expected: 'https://example.com', input: 'https://example.com/' },
			{ expected: 'http://localhost:3000', input: 'http://localhost:3000/' },
			{
				expected: 'https://api.example.com/path',
				input: 'https://api.example.com/path/',
			},
		];

		for (const { input, expected } of testCases) {
			const result = validateBackendURL(input);
			expect(result.isAbsolute).toBe(true);
			expect(result.normalizedURL).toBe(expected);
		}
	});

	it('should throw error for invalid absolute URLs', () => {
		const invalidAbsoluteURLs = [
			'ftp://example.com',
			'ws://example.com',
			'not-a-url://',
			'http:/invalid-url',
		];

		for (const url of invalidAbsoluteURLs) {
			expect(() => validateBackendURL(url)).toThrow();
		}
	});

	it('should validate relative URLs correctly', () => {
		const testCases = [
			{ expected: '/api/c15t', input: '/api/c15t' },
			{ expected: '/path/to/api', input: '/path/to/api' },
		];

		for (const { input, expected } of testCases) {
			const result = validateBackendURL(input);
			expect(result.isAbsolute).toBe(false);
			expect(result.normalizedURL).toBe(expected);
		}
	});

	it('should trim trailing slashes from relative URLs', () => {
		const testCases = [
			{ expected: '/api/c15t', input: '/api/c15t/' },
			{ expected: '/path/to/api', input: '/path/to/api/' },
			// Root path should be preserved
			{ expected: '/', input: '/' },
		];

		for (const { input, expected } of testCases) {
			const result = validateBackendURL(input);
			expect(result.isAbsolute).toBe(false);
			expect(result.normalizedURL).toBe(expected);
		}
	});

	it('should throw error for invalid relative URLs', () => {
		const invalidRelativeURLs = [
			'not-a-url',
			'http://',
			'https://',
			'api/c15t',
		];

		for (const url of invalidRelativeURLs) {
			expect(() => validateBackendURL(url)).toThrow();
		}
	});
});

describe('normalizeBackendURL', () => {
	const createMockHeaders = (headers: Record<string, string>) =>
		({
			get: (key: string) => headers[key.toLowerCase()] || null,
		}) as Headers;

	it('should return absolute URLs unchanged', () => {
		const absoluteURL = 'https://example.com/api';
		const headers = createMockHeaders({});

		const result = normalizeBackendURL(absoluteURL, headers);
		expect(result).toBe(absoluteURL);
	});

	it('should trim trailing slashes from absolute URLs', () => {
		const testCases = [
			{
				expected: 'https://my-instance.c15t.dev',
				input: 'https://my-instance.c15t.dev/',
			},
			{
				expected: 'https://example.com/api',
				input: 'https://example.com/api/',
			},
		];

		const headers = createMockHeaders({});

		for (const { input, expected } of testCases) {
			const result = normalizeBackendURL(input, headers);
			expect(result).toBe(expected);
		}
	});

	it('should construct URL from x-forwarded headers', () => {
		const headers = createMockHeaders({
			'x-forwarded-host': 'example.com',
			'x-forwarded-proto': 'https',
		});

		const result = normalizeBackendURL('/api/c15t', headers);
		expect(result).toBe('https://example.com/api/c15t');
	});

	it('should construct URL from x-forwarded headers and trim trailing slashes', () => {
		const testCases = [
			{
				expected: 'https://my-instance.c15t.dev/api/c15t',
				headers: {
					'x-forwarded-host': 'my-instance.c15t.dev',
					'x-forwarded-proto': 'https',
				},
				input: '/api/c15t/',
			},
			{
				expected: 'https://example.com/api',
				headers: {
					'x-forwarded-host': 'example.com',
					'x-forwarded-proto': 'https',
				},
				input: '/api/',
			},
		];

		for (const { headers: headerData, input, expected } of testCases) {
			const headers = createMockHeaders(headerData);
			const result = normalizeBackendURL(input, headers);
			expect(result).toBe(expected);
		}
	});

	it('should use host header when x-forwarded-host is not available', () => {
		const headers = createMockHeaders({
			host: 'example.com',
		});

		const result = normalizeBackendURL('/api/c15t', headers);
		expect(result).toBe('https://example.com/api/c15t');
	});

	it('should use referer when host headers are not available', () => {
		const headers = createMockHeaders({
			referer: 'https://example.com/some/path',
		});

		const result = normalizeBackendURL('/api/c15t', headers);
		expect(result).toBe('https://example.com/api/c15t');
	});

	it('should use referer and trim trailing slashes', () => {
		const headers = createMockHeaders({
			referer: 'https://my-instance.c15t.dev/some/path',
		});

		const result = normalizeBackendURL('/api/c15t/', headers);
		expect(result).toBe('https://my-instance.c15t.dev/api/c15t');
	});

	it('should return null when no headers are available to determine base URL', () => {
		const headers = createMockHeaders({});

		const result = normalizeBackendURL('/api/c15t', headers);
		expect(result).toBeNull();
	});

	it('should return null for invalid URLs', () => {
		const headers = createMockHeaders({
			host: 'example.com',
		});

		const result = normalizeBackendURL('not-a-url://', headers);
		expect(result).toBeNull();
	});
});
