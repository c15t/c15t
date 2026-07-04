import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSSRData } from './fetch-ssr-data';

function createRequestHeaders(): Headers {
	const headers = new Headers();
	headers.set('cf-ipcountry', 'US');
	headers.set('x-forwarded-proto', 'https');
	headers.set('x-forwarded-host', 'example.com');
	return headers;
}

function createResponse(payload: unknown) {
	return {
		ok: true,
		headers: new Headers(),
		json: vi.fn().mockResolvedValue(payload),
	} as unknown as Response;
}

describe('fetchSSRData', () => {
	afterEach(() => {
		vi.restoreAllMocks();
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
		expect(result?.metadata?.requestContext).toEqual({
			backendURL: 'https://example.com/api/c15t',
			country: 'US',
			region: null,
			language: null,
			gpc: false,
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

	it('runs independent fetches for concurrent calls', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createResponse({ gvl: null, categories: [] }));
		vi.stubGlobal('fetch', fetchMock);

		const headers = createRequestHeaders();

		await Promise.all([
			fetchSSRData({
				backendURL: 'https://consent.example.com/api/c15t',
				headers,
			}),
			fetchSSRData({
				backendURL: 'https://consent.example.com/api/c15t',
				headers,
			}),
		]);

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('returns init data when backend responds with success', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createResponse({ gvl: null, categories: [] }));
		vi.stubGlobal('fetch', fetchMock);

		const headers = createRequestHeaders();

		const result = await fetchSSRData({
			backendURL: 'https://consent.example.com/api/c15t',
			headers,
		});

		expect(result).toMatchObject({
			init: { gvl: null, categories: [] },
			gvl: null,
		});
		expect(result?.metadata).toEqual({
			requestContext: {
				backendURL: 'https://consent.example.com/api/c15t',
				country: 'US',
				region: null,
				language: null,
				gpc: false,
			},
			cache: {
				isHit: false,
				detail: null,
			},
			requestDurationMs: expect.any(Number),
		});
	});

	it('records overrides and gpc in request-context metadata', async () => {
		const headers = createRequestHeaders();
		headers.set('accept-language', 'en-GB');
		headers.set('sec-gpc', '1');

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ gvl: null, categories: [] }), {
					status: 200,
					headers: {
						'content-type': 'application/json',
					},
				})
			)
		);

		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers,
			overrides: {
				country: 'DE',
				region: 'BE',
				language: 'de',
			},
		});

		expect(result?.metadata?.requestContext).toEqual({
			backendURL: 'https://example.com/api/c15t',
			country: 'DE',
			region: 'BE',
			language: 'de',
			gpc: true,
		});
	});

	it('returns undefined when backend responds with non-ok status', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		} as Response);
		vi.stubGlobal('fetch', fetchMock);

		const headers = createRequestHeaders();

		const result = await fetchSSRData({
			backendURL: 'https://consent.example.com/api/c15t',
			headers,
		});

		expect(result).toBeUndefined();
	});
});
