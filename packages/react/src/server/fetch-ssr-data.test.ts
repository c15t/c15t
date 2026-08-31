import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSSRData } from './fetch-ssr-data';

const createRequestHeaders = function createRequestHeaders(): Headers {
	const headers = new Headers();
	headers.set('cf-ipcountry', 'US');
	headers.set('x-forwarded-proto', 'https');
	headers.set('x-forwarded-host', 'example.com');
	return headers;
};

const createResponse = function createResponse(payload: unknown) {
	return {
		headers: new Headers(),
		json: vi.fn().mockResolvedValue(payload),
		ok: true,
	} as unknown as Response;
};

describe('fetchSSRData', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('returns SSR metadata with cache-hit diagnostics and request duration', async () => {
		const initResponse = {
			branding: 'c15t',
			jurisdiction: 'CCPA',
			location: { countryCode: 'US', regionCode: 'CA' },
			translations: { language: 'en', translations: {} },
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(initResponse), {
					headers: {
						age: '10',
						'content-type': 'application/json',
						'x-vercel-cache': 'HIT',
					},
					status: 200,
				})
			)
		);

		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
		});

		expect(result?.init).toEqual(initResponse);
		expect(result?.metadata?.cache).toEqual({
			detail: 'x-vercel-cache=HIT, age=10',
			isHit: true,
		});
		expect(result?.metadata?.requestContext).toEqual({
			backendURL: 'https://example.com/api/c15t',
			country: 'US',
			gpc: false,
			language: null,
			region: null,
		});
		expect(typeof result?.metadata?.requestDurationMs).toBe('number');
		expect(result?.metadata?.requestDurationMs).toBeGreaterThanOrEqual(0);
	});

	it('returns cache metadata for non-hit responses', async () => {
		const initResponse = {
			branding: 'c15t',
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: null },
			translations: { language: 'de', translations: {} },
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(initResponse), {
					headers: {
						'content-type': 'application/json',
						'x-vercel-cache': 'MISS',
					},
					status: 200,
				})
			)
		);

		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
		});

		expect(result?.metadata?.cache).toEqual({
			detail: 'x-vercel-cache=MISS',
			isHit: false,
		});
	});

	it('runs independent fetches for concurrent calls', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createResponse({ categories: [], gvl: null }));
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
			.mockResolvedValue(createResponse({ categories: [], gvl: null }));
		vi.stubGlobal('fetch', fetchMock);

		const headers = createRequestHeaders();

		const result = await fetchSSRData({
			backendURL: 'https://consent.example.com/api/c15t',
			headers,
		});

		expect(result).toMatchObject({
			gvl: null,
			init: { categories: [], gvl: null },
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'https://consent.example.com/api/c15t/init',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-c15t-version': expect.any(String),
				}),
			})
		);
		expect(result?.metadata).toEqual({
			cache: {
				detail: null,
				isHit: false,
			},
			requestContext: {
				backendURL: 'https://consent.example.com/api/c15t',
				country: 'US',
				gpc: false,
				language: null,
				region: null,
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
				new Response(JSON.stringify({ categories: [], gvl: null }), {
					headers: {
						'content-type': 'application/json',
					},
					status: 200,
				})
			)
		);

		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers,
			overrides: {
				country: 'DE',
				language: 'de',
				region: 'BE',
			},
		});

		expect(result?.metadata?.requestContext).toEqual({
			backendURL: 'https://example.com/api/c15t',
			country: 'DE',
			gpc: true,
			language: 'de',
			region: 'BE',
		});
	});

	it('forwards an incoming c15t version header during SSR init', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createResponse({ categories: [], gvl: null }));
		vi.stubGlobal('fetch', fetchMock);

		const headers = createRequestHeaders();
		headers.set('x-c15t-version', '1.2.3');

		await fetchSSRData({
			backendURL: 'https://consent.example.com/api/c15t',
			headers,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'https://consent.example.com/api/c15t/init',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-c15t-version': '1.2.3',
				}),
			})
		);
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
