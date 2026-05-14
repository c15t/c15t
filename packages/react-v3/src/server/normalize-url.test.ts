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
				input: 'https://my-instance.c15t.dev/',
				expected: 'https://my-instance.c15t.dev',
			},
			{ input: 'https://example.com/', expected: 'https://example.com' },
			{ input: 'http://localhost:3000/', expected: 'http://localhost:3000' },
			{
				input: 'https://api.example.com/path/',
				expected: 'https://api.example.com/path',
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
			{ input: '/api/c15t', expected: '/api/c15t' },
			{ input: '/path/to/api', expected: '/path/to/api' },
		];

		for (const { input, expected } of testCases) {
			const result = validateBackendURL(input);
			expect(result.isAbsolute).toBe(false);
			expect(result.normalizedURL).toBe(expected);
		}
	});

	it('should trim trailing slashes from relative URLs', () => {
		const testCases = [
			{ input: '/api/c15t/', expected: '/api/c15t' },
			{ input: '/path/to/api/', expected: '/path/to/api' },
			{ input: '/', expected: '/' }, // Root path should be preserved
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
	const createMockHeaders = (headers: Record<string, string>) => {
		return {
			get: (key: string) => headers[key.toLowerCase()] || null,
		} as Headers;
	};

	it('should return absolute URLs unchanged', () => {
		const absoluteURL = 'https://example.com/api';
		const headers = createMockHeaders({});

		const result = normalizeBackendURL(absoluteURL, headers);
		expect(result).toBe(absoluteURL);
	});

	it('should trim trailing slashes from absolute URLs', () => {
		const testCases = [
			{
				input: 'https://my-instance.c15t.dev/',
				expected: 'https://my-instance.c15t.dev',
			},
			{
				input: 'https://example.com/api/',
				expected: 'https://example.com/api',
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
			'x-forwarded-proto': 'https',
			'x-forwarded-host': 'example.com',
		});

		const result = normalizeBackendURL('/api/c15t', headers);
		expect(result).toBe('https://example.com/api/c15t');
	});

	it('should construct URL from x-forwarded headers and trim trailing slashes', () => {
		const testCases = [
			{
				headers: {
					'x-forwarded-proto': 'https',
					'x-forwarded-host': 'my-instance.c15t.dev',
				},
				input: '/api/c15t/',
				expected: 'https://my-instance.c15t.dev/api/c15t',
			},
			{
				headers: {
					'x-forwarded-proto': 'https',
					'x-forwarded-host': 'example.com',
				},
				input: '/api/',
				expected: 'https://example.com/api',
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
