import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	headers: vi.fn(),
	cache: vi.fn((callback: () => Promise<unknown>) => callback),
	cacheKey: vi.fn(() => 'shared-context'),
}));
vi.mock('@c15t/react/server', () => ({
	fetchSSRData: mocks.fetch,
	createSSRInitCacheKey: mocks.cacheKey,
	normalizeBackendURL: (url: string) => url,
}));
vi.mock('next/cache', () => ({
	default: { unstable_cache: mocks.cache },
	unstable_cache: mocks.cache,
}));
vi.mock('next/headers', () => ({
	default: { headers: mocks.headers },
	headers: mocks.headers,
}));

import { fetchInitialData } from './initial-data';

describe('SSR init caching', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.headers.mockResolvedValue(new Headers({ host: 'example.com' }));
		mocks.fetch.mockResolvedValue({ init: { gvl: null } });
	});

	it('retains shared caching by default without enabling attribution', async () => {
		await fetchInitialData({ backendURL: 'https://consent.example' });
		expect(mocks.cache).toHaveBeenCalledWith(
			expect.any(Function),
			['c15t:nextjs:fetchInitialData', 'shared-context'],
			{ revalidate: 1 }
		);
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
		expect(mocks.fetch.mock.calls[0]?.[0]).not.toHaveProperty('visitTracking');
	});

	it.each([
		undefined,
		{ revalidateSeconds: 3600 },
		{ revalidateSeconds: false as const },
	])('never shares an attributed result through unstable_cache (%j)', async (nextCache) => {
		await fetchInitialData({
			backendURL: 'https://consent.example',
			visitTracking: true,
			nextCache,
		});
		expect(mocks.cache).not.toHaveBeenCalled();
		expect(mocks.cacheKey).not.toHaveBeenCalled();
		expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				visitTracking: true,
				headers: expect.any(Headers),
			})
		);
	});

	it('leaves speculative detection to the helper without caching its result as a live request', async () => {
		const headers = new Headers({
			'next-router-prefetch': '1',
			host: 'example.com',
		});
		mocks.headers.mockResolvedValue(headers);
		await fetchInitialData({
			backendURL: 'https://consent.example',
			visitTracking: true,
		});
		expect(mocks.cache).not.toHaveBeenCalled();
		expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ headers })
		);
	});
});
