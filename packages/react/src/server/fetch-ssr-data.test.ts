import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSSRData } from './fetch-ssr-data';

function createRequestHeaders(): Headers {
	const headers = new Headers();
	headers.set('cf-ipcountry', 'US');
	headers.set('x-forwarded-proto', 'https');
	headers.set('x-forwarded-host', 'example.com');
	return headers;
}

describe('fetchSSRData', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns SSR metadata with cache-hit diagnostics and request duration', async () => {
		const initResponse = {
			jurisdiction: 'CCPA',
			location: { countryCode: 'US', regionCode: 'CA' },
			translations: { language: 'en', translations: {} },
			branding: 'c15t',
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(initResponse), {
					status: 200,
					headers: {
						'content-type': 'application/json',
						'x-vercel-cache': 'HIT',
						age: '10',
					},
				})
			)
		);

		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
		});

		expect(result?.init).toEqual(initResponse);
		expect(result?.metadata?.cache).toEqual({
			isHit: true,
			detail: 'x-vercel-cache=HIT, age=10',
		});
		expect(typeof result?.metadata?.requestDurationMs).toBe('number');
		expect(result?.metadata?.requestDurationMs).toBeGreaterThanOrEqual(0);
	});

	it('returns cache metadata for non-hit responses', async () => {
		const initResponse = {
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: null },
			translations: { language: 'de', translations: {} },
			branding: 'c15t',
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(initResponse), {
					status: 200,
					headers: {
						'content-type': 'application/json',
						'x-vercel-cache': 'MISS',
					},
				})
			)
		);

		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
		});

		expect(result?.metadata?.cache).toEqual({
			isHit: false,
			detail: 'x-vercel-cache=MISS',
		});
	});
});
