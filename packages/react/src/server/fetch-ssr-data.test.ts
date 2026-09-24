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
		expect(fetchMock).toHaveBeenCalledWith(
			'https://consent.example.com/api/c15t/init',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-c15t-version': expect.any(String),
				}),
			})
		);
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

	it('forwards an incoming c15t version header during SSR init', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createResponse({ gvl: null, categories: [] }));
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

const trackedVisitId = '951baf37-5725-48a2-b5d7-dd67c4e1e75d';
const anotherVisitId = '89ab30ac-8c1a-4f17-8f15-bf3b16f66d41';

describe('request-scoped SSR journey attribution', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('uses one existing init fetch per call with distinct IDs and matching echoes', async () => {
		const calls: Array<{ url: URL; options: RequestInit | undefined }> = [];
		const fetchMock = vi.fn<typeof fetch>(async (input, options) => {
			const url = new URL(
				typeof input === 'string'
					? input
					: input instanceof URL
						? input.href
						: input.url
			);
			calls.push({ url, options });
			return Response.json({
				gvl: null,
				visitTracking: {
					enabled: true,
					visitId: url.searchParams.get('c15tVisitId'),
				},
			});
		});
		vi.stubGlobal('fetch', fetchMock);
		const results = await Promise.all(
			[0, 1].map(() =>
				fetchSSRData({
					backendURL: 'https://consent.example.com',
					headers: createRequestHeaders(),
					visitTracking: true,
				})
			)
		);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(
			new Set(calls.map(({ url }) => url.searchParams.get('c15tVisitId'))).size
		).toBe(2);
		for (const [index, { url, options }] of calls.entries()) {
			const visitId = url.searchParams.get('c15tVisitId');
			expect(visitId).toMatch(/^[a-f0-9-]{36}$/);
			expect(url.pathname).toBe('/init');
			expect([...url.searchParams.keys()]).toEqual([
				'c15tVisitId',
				'c15tVisitSource',
			]);
			expect(url.searchParams.get('c15tVisitSource')).toBe('ssr');
			expect(options?.cache).toBe('no-store');
			const headers = new Headers(options?.headers);
			expect(headers.has('x-c15t-visit-id')).toBe(false);
			expect(headers.has('x-c15t-visit-source')).toBe(false);
			expect(headers.get('origin')).toBe('https://example.com');
			expect(results[index]?.metadata?.visitTracking).toEqual({
				source: 'ssr',
				visitId,
			});
		}
	});

	it.each([
		undefined,
		{ enabled: true, visitId: anotherVisitId },
		{ enabled: false, visitId: trackedVisitId },
	])('does not attribute an absent, mismatched or disabled echo', async (visitTracking) => {
		vi.stubGlobal('crypto', { randomUUID: () => trackedVisitId });
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json({ gvl: null, visitTracking }))
		);
		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
			visitTracking: true,
		});
		expect(result?.init).toBeDefined();
		expect(result?.metadata?.visitTracking).toBeUndefined();
	});

	it('keeps default shared SSR untracked even if a response contains an ID', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			Response.json({
				gvl: null,
				visitTracking: { enabled: true, visitId: trackedVisitId },
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'https://example.com/api/c15t/init',
			expect.not.objectContaining({ cache: 'no-store' })
		);
		expect(result?.metadata?.visitTracking).toBeUndefined();
	});

	it.each([
		['purpose', 'prefetch'],
		['sec-purpose', 'prefetch;prerender'],
		['purpose', 'prerender'],
		['next-router-prefetch', '1'],
		['x-middleware-prefetch', '1'],
	])('leaves speculative %s requests untracked without adding another fetch', async (name, value) => {
		const headers = createRequestHeaders();
		headers.set(name, value);
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ gvl: null }));
		vi.stubGlobal('fetch', fetchMock);
		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers,
			visitTracking: true,
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://example.com/api/c15t/init',
			expect.not.objectContaining({ cache: 'no-store' })
		);
		expect(result?.metadata?.visitTracking).toBeUndefined();
	});

	it('uses a valid incoming website origin before the forwarded host', async () => {
		const headers = createRequestHeaders();
		headers.set('origin', 'https://website.example');
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ gvl: null }));
		vi.stubGlobal('fetch', fetchMock);
		await fetchSSRData({
			backendURL: 'https://consent.example',
			headers,
			visitTracking: true,
		});
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('https://consent.example/init?'),
			expect.objectContaining({
				headers: expect.objectContaining({ Origin: 'https://website.example' }),
			})
		);
	});

	it('never derives the website origin from an absolute backend URL', async () => {
		const headers = new Headers({
			'cf-ipcountry': 'US',
			origin: 'https://website.example/private?secret=1',
		});
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ gvl: null }));
		vi.stubGlobal('fetch', fetchMock);
		await fetchSSRData({
			backendURL: 'https://consent.example',
			headers,
			visitTracking: true,
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'https://consent.example/init',
			expect.not.objectContaining({ cache: 'no-store' })
		);
	});

	it('keeps consent initialisation working when secure UUID generation is unavailable', async () => {
		vi.stubGlobal('crypto', undefined);
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ gvl: null }));
		vi.stubGlobal('fetch', fetchMock);
		const result = await fetchSSRData({
			backendURL: '/api/c15t',
			headers: createRequestHeaders(),
			visitTracking: true,
		});
		expect(result?.init).toBeDefined();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://example.com/api/c15t/init',
			expect.not.objectContaining({ cache: 'no-store' })
		);
	});

	it('preserves ordinary fetch error handling when forwarded headers produce an invalid URL', async () => {
		const headers = createRequestHeaders();
		headers.set('origin', 'https://website.example');
		headers.set('x-forwarded-host', '[');
		const fetchMock = vi.fn().mockRejectedValue(new TypeError('Invalid URL'));
		vi.stubGlobal('fetch', fetchMock);
		await expect(
			fetchSSRData({
				backendURL: '/api/c15t',
				headers,
				visitTracking: true,
			})
		).resolves.toBeUndefined();
		expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
			'https://[/api/c15t/init',
			expect.not.objectContaining({ cache: 'no-store' })
		);
	});
});
