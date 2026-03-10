import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSSRData } from './fetch-ssr-data';

function createResponse(payload: unknown) {
	return {
		ok: true,
		json: vi.fn().mockResolvedValue(payload),
	} as unknown as Response;
}

describe('fetchSSRData', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('runs independent fetches for concurrent calls', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createResponse({ gvl: null, categories: [] }));
		vi.stubGlobal('fetch', fetchMock);

		const headers = new Headers({
			'accept-language': 'en-US,en;q=0.9',
			'user-agent': 'test-agent',
		});

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

		const headers = new Headers({
			'accept-language': 'en-US,en;q=0.9',
			'user-agent': 'test-agent',
		});

		const result = await fetchSSRData({
			backendURL: 'https://consent.example.com/api/c15t',
			headers,
		});

		expect(result).toEqual({
			init: { gvl: null, categories: [] },
			gvl: null,
		});
	});

	it('returns undefined when backend responds with non-ok status', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		} as Response);
		vi.stubGlobal('fetch', fetchMock);

		const headers = new Headers({
			'accept-language': 'en-US,en;q=0.9',
			'user-agent': 'test-agent',
		});

		const result = await fetchSSRData({
			backendURL: 'https://consent.example.com/api/c15t',
			headers,
		});

		expect(result).toBeUndefined();
	});
});
