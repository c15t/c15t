import { describe, expect, test, vi } from 'vitest';

import { clearGvlCache, fetchCachedGvl } from '../transports/gvl-cache';

const list = function list(version: number) {
	return { vendorListVersion: version } as unknown as Record<string, unknown>;
};

const createFetch = function createFetch(
	respond: () => Response = () =>
		Response.json(list(1), {
			headers: { 'cache-control': 'public, max-age=3600' },
		})
) {
	return vi
		.fn()
		.mockImplementation(() =>
			Promise.resolve(respond())
		) as unknown as typeof globalThis.fetch & ReturnType<typeof vi.fn>;
};

describe('fetchCachedGvl', () => {
	test('serves the cached list within max-age and refetches after', async () => {
		const cache = new Map();
		const fetch = createFetch();
		await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 0,
			url: 'https://gvl.example',
		});
		await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 3_599_000,
			url: 'https://gvl.example',
		});
		expect(fetch).toHaveBeenCalledTimes(1);
		await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 3_601_000,
			url: 'https://gvl.example',
		});
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test('keys by language and coalesces concurrent misses', async () => {
		const cache = new Map();
		const fetch = createFetch();
		await Promise.all([
			fetchCachedGvl({
				cache,
				fetch,
				language: 'de',
				now: 0,
				url: 'https://gvl.example',
			}),
			fetchCachedGvl({
				cache,
				fetch,
				language: 'de',
				now: 0,
				url: 'https://gvl.example',
			}),
			fetchCachedGvl({
				cache,
				fetch,
				language: 'fr',
				now: 0,
				url: 'https://gvl.example',
			}),
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test('serves the stale list when a refresh fails, and throws with no fallback', async () => {
		const cache = new Map();
		let status = 200;
		const fetch = createFetch(() =>
			status === 200
				? Response.json(list(7), { headers: { 'cache-control': 'max-age=10' } })
				: new Response('blocked', { status })
		);
		const first = await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 0,
			url: 'https://gvl.example',
		});
		status = 403;
		const stale = await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 20_000,
			url: 'https://gvl.example',
		});
		expect(stale).toBe(first);
		await expect(
			fetchCachedGvl({
				cache: new Map(),
				fetch,
				label: 'test',
				language: 'en',
				now: 0,
				url: 'https://gvl.example',
			})
		).rejects.toThrow(/test: GVL responded 403/u);
	});

	test('caches a 204 as null and clearGvlCache drops it', async () => {
		const cache = new Map();
		const fetch = createFetch(() => new Response(null, { status: 204 }));
		expect(
			await fetchCachedGvl({
				cache,
				fetch,
				language: 'en',
				now: 0,
				url: 'https://gvl.example',
			})
		).toBeNull();
		await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 1000,
			url: 'https://gvl.example',
		});
		expect(fetch).toHaveBeenCalledTimes(1);
		clearGvlCache(cache);
		await fetchCachedGvl({
			cache,
			fetch,
			language: 'en',
			now: 2000,
			url: 'https://gvl.example',
		});
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
