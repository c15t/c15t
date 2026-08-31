import { describe, expect, it } from 'vitest';

import { createSSRInitCacheKey } from './init-cache-key';

describe('createSSRInitCacheKey', () => {
	it('builds key from normalized URL and relevant headers', () => {
		const headers = new Headers({
			'accept-language': 'en-US,en;q=0.9',
			'cf-ipcountry': 'US',
			'sec-gpc': '1',
			'x-vercel-ip-country-region': 'CA',
		});

		const key = createSSRInitCacheKey({
			headers,
			normalizedURL: 'https://example.com/api/c15t',
		});

		expect(key).toBe(
			JSON.stringify({
				country: 'US',
				gpc: '1',
				language: 'en-US,en;q=0.9',
				normalizedURL: 'https://example.com/api/c15t',
				region: 'CA',
			})
		);
	});

	it('prefers overrides over extracted headers', () => {
		const headers = new Headers({
			'accept-language': 'en-US,en;q=0.9',
			'cf-ipcountry': 'US',
			'sec-gpc': '0',
			'x-vercel-ip-country-region': 'CA',
		});

		const key = createSSRInitCacheKey({
			headers,
			normalizedURL: 'https://example.com/api/c15t',
			overrides: {
				country: 'DE',
				language: 'de-DE,de;q=0.9',
				region: 'BE',
			},
		});

		expect(key).toBe(
			JSON.stringify({
				country: 'DE',
				gpc: '0',
				language: 'de-DE,de;q=0.9',
				normalizedURL: 'https://example.com/api/c15t',
				region: 'BE',
			})
		);
	});

	it('is stable regardless of header insertion order', () => {
		const firstHeaders = new Headers();
		firstHeaders.set('accept-language', 'en-US,en;q=0.9');
		firstHeaders.set('cf-ipcountry', 'US');

		const secondHeaders = new Headers();
		secondHeaders.set('cf-ipcountry', 'US');
		secondHeaders.set('accept-language', 'en-US,en;q=0.9');

		const firstKey = createSSRInitCacheKey({
			headers: firstHeaders,
			normalizedURL: 'https://example.com/api/c15t',
		});
		const secondKey = createSSRInitCacheKey({
			headers: secondHeaders,
			normalizedURL: 'https://example.com/api/c15t',
		});

		expect(firstKey).toBe(secondKey);
	});
});
