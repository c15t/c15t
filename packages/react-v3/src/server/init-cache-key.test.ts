import { describe, expect, it } from 'vitest';
import { createSSRInitCacheKey } from './init-cache-key';

describe('createSSRInitCacheKey', () => {
	it('builds key from normalized URL and relevant headers', () => {
		const headers = new Headers({
			'cf-ipcountry': 'US',
			'x-vercel-ip-country-region': 'CA',
			'accept-language': 'en-US,en;q=0.9',
			'sec-gpc': '1',
		});

		const key = createSSRInitCacheKey({
			normalizedURL: 'https://example.com/api/c15t',
			headers,
		});

		expect(key).toBe(
			JSON.stringify({
				normalizedURL: 'https://example.com/api/c15t',
				country: 'US',
				region: 'CA',
				language: 'en-US,en;q=0.9',
				gpc: '1',
			})
		);
	});

	it('prefers overrides over extracted headers', () => {
		const headers = new Headers({
			'cf-ipcountry': 'US',
			'x-vercel-ip-country-region': 'CA',
			'accept-language': 'en-US,en;q=0.9',
			'sec-gpc': '0',
		});

		const key = createSSRInitCacheKey({
			normalizedURL: 'https://example.com/api/c15t',
			headers,
			overrides: {
				country: 'DE',
				region: 'BE',
				language: 'de-DE,de;q=0.9',
			},
		});

		expect(key).toBe(
			JSON.stringify({
				normalizedURL: 'https://example.com/api/c15t',
				country: 'DE',
				region: 'BE',
				language: 'de-DE,de;q=0.9',
				gpc: '0',
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
			normalizedURL: 'https://example.com/api/c15t',
			headers: firstHeaders,
		});
		const secondKey = createSSRInitCacheKey({
			normalizedURL: 'https://example.com/api/c15t',
			headers: secondHeaders,
		});

		expect(firstKey).toBe(secondKey);
	});
});
