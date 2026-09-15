import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
	clearManifestCache,
	fetchCachedManifest,
	MANIFEST_DEDUPE_TTL_SECONDS,
	resolveManifestCacheTtlSeconds,
} from '../manifest-cache';
import {
	createManifestCache,
	fetchCachedManifest as fetchThroughRuntime,
	readRevalidationFloors,
} from '../manifest-cache-runtime';

const manifest = { revision: 'r1', schemaVersion: 1 };
const URL_UNDER_TEST = 'https://consent.example.com/manifest';

const jsonResponse = function jsonResponse(
	headers: Record<string, string>,
	body: unknown = manifest
) {
	return new Response(JSON.stringify(body), { headers, status: 200 });
};

describe('fetchCachedManifest', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	test('serves a fresh entry without a request for s-maxage seconds', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(jsonResponse({ 'cache-control': 's-maxage=60' }));

		const first = await fetchCachedManifest({
			fetch: fetchSpy,
			now: 0,
			url: URL_UNDER_TEST,
		});
		const second = await fetchCachedManifest({
			fetch: fetchSpy,
			now: 59_000,
			url: URL_UNDER_TEST,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);
		expect(first.sMaxAge).toBe(60);
		expect(first.expiresAt).toBe(60_000);
	});

	test('revalidates an expired entry with If-None-Match and keeps it on 304', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({ 'cache-control': 's-maxage=10', etag: '"r1"' })
			)
			.mockResolvedValueOnce(
				new Response(null, {
					headers: { 'cache-control': 's-maxage=10', etag: '"r1"' },
					status: 304,
				})
			);

		await fetchCachedManifest({ fetch: fetchSpy, now: 0, url: URL_UNDER_TEST });
		const refreshed = await fetchCachedManifest({
			fetch: fetchSpy,
			now: 11_000,
			url: URL_UNDER_TEST,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(fetchSpy.mock.calls[1]?.[1]?.headers).toMatchObject({
			'if-none-match': '"r1"',
		});
		expect(refreshed.manifest).toEqual(manifest);
		expect(refreshed.expiresAt).toBe(21_000);
	});

	test('does not cache responses the backend marks private or no-store', async () => {
		const fetchSpy = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(jsonResponse({ 'cache-control': 'private, no-store' }))
			);

		await fetchCachedManifest({ fetch: fetchSpy, now: 0, url: URL_UNDER_TEST });
		await fetchCachedManifest({ fetch: fetchSpy, now: 1, url: URL_UNDER_TEST });

		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	test('falls back to a short dedupe window without s-maxage', () => {
		expect(resolveManifestCacheTtlSeconds(undefined, 0)).toBe(
			MANIFEST_DEDUPE_TTL_SECONDS
		);
		expect(resolveManifestCacheTtlSeconds('no-cache', 0)).toBe(0);
		expect(resolveManifestCacheTtlSeconds('s-maxage=300', 300)).toBe(300);
	});

	test('passes framework request init through to fetch', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(jsonResponse({ 'cache-control': 's-maxage=1' }));

		await fetchCachedManifest({
			fetch: fetchSpy,
			init: { next: { revalidate: 1 } } as RequestInit,
			url: URL_UNDER_TEST,
		});

		expect(fetchSpy).toHaveBeenCalledWith(
			URL_UNDER_TEST,
			expect.objectContaining({ method: 'GET', next: { revalidate: 1 } })
		);
	});

	test('throws on an error status', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response('', { status: 500 }));

		await expect(
			fetchCachedManifest({ fetch: fetchSpy, url: URL_UNDER_TEST })
		).rejects.toThrow('responded 500');
	});

	test('coalesces concurrent misses into one backend request', async () => {
		const gate = Promise.withResolvers<undefined>();
		const fetchSpy = vi.fn().mockImplementation(async () => {
			await gate.promise;
			return jsonResponse({ 'cache-control': 's-maxage=60' });
		});

		const first = fetchCachedManifest({ fetch: fetchSpy, url: URL_UNDER_TEST });
		const second = fetchCachedManifest({
			fetch: fetchSpy,
			url: URL_UNDER_TEST,
		});
		gate.resolve(undefined);

		expect(await second).toBe(await first);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test('serves a stale entry immediately inside the stale-while-revalidate window without waiting for the revalidation fetch', async () => {
		const gate = Promise.withResolvers<undefined>();
		let requests = 0;
		const fetchSpy = vi.fn(async () => {
			requests += 1;
			if (requests === 1) {
				return jsonResponse({
					'cache-control': 's-maxage=60, stale-while-revalidate=120',
				});
			}
			await gate.promise;
			return new Response(null, {
				headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=120' },
				status: 304,
			});
		});

		const first = await fetchCachedManifest({
			fetch: fetchSpy,
			now: 0,
			url: URL_UNDER_TEST,
		});

		const served = await fetchCachedManifest({
			fetch: fetchSpy,
			now: 70_000,
			url: URL_UNDER_TEST,
		});

		expect(served).toBe(first);
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

		gate.resolve(undefined);
	});
});

describe('background revalidation lifetime', () => {
	test('hands the background revalidation promise to onBackgroundRevalidate and it never rejects', async () => {
		const cache = createManifestCache();
		let requests = 0;
		const fetchSpy = vi.fn(() => {
			requests += 1;
			if (requests === 1) {
				return Promise.resolve(
					jsonResponse({
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
						etag: '"r1"',
					})
				);
			}
			return Promise.reject(new Error('upstream down'));
		});
		const registered: Promise<void>[] = [];
		const onBackgroundRevalidate = (promise: Promise<void>) => {
			registered.push(promise);
		};

		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 0,
			onBackgroundRevalidate,
			sourceURL: URL_UNDER_TEST,
		});
		// Fresh read: nothing to keep alive.
		expect(registered).toHaveLength(0);

		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 61_000,
			onBackgroundRevalidate,
			sourceURL: URL_UNDER_TEST,
		});
		expect(registered).toHaveLength(1);
		await expect(registered[0]).resolves.toBeUndefined();
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});

describe('background revalidation lifetime: registration failures', () => {
	test('a throwing onBackgroundRevalidate does not reject the stale read', async () => {
		const cache = createManifestCache();
		const fetchSpy = vi.fn(() =>
			Promise.resolve(
				jsonResponse({
					'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
					etag: '"r1"',
				})
			)
		);
		const first = await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 0,
			sourceURL: URL_UNDER_TEST,
		});
		const served = await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 61_000,
			onBackgroundRevalidate: () => {
				throw new Error('after() called outside a request scope');
			},
			sourceURL: URL_UNDER_TEST,
		});
		expect(served).toBe(first);
		// The refresh itself still ran.
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
	});
});

describe('revalidation floor bookkeeping', () => {
	const flush = () =>
		new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	const staleOnArrival = () =>
		Promise.resolve(
			jsonResponse({
				'cache-control': 'public, s-maxage=0, stale-while-revalidate=600',
				etag: '"r1"',
			})
		);

	test('holds at most a fixed number of floors however many keys are minted', async () => {
		const cache = createManifestCache({ maxEntries: 2 });
		const fetchSpy = vi.fn(staleOnArrival);
		const junk = (index: number) => `${URL_UNDER_TEST}?language=x${index}`;

		// Each minted key: fill, then a stale read that starts a background
		// fill whose stale-on-arrival answer leaves a floor record. The
		// 2-entry cap evicts the key soon after, which the runtime cannot
		// observe, so the floor map has to bound itself.
		for (let index = 0; index < 400; index += 1) {
			const now = 1000 + index;
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await fetchThroughRuntime({
				cache,
				fetch: fetchSpy,
				now,
				sourceURL: junk(index),
			});
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await fetchThroughRuntime({
				cache,
				fetch: fetchSpy,
				now: now + 1,
				sourceURL: junk(index),
			});
		}
		await flush();
		const floors = readRevalidationFloors(cache);
		expect(floors.size).toBeLessThanOrEqual(256);
		// Oldest records went first; the most recent key is still tracked.
		expect(floors.has(junk(399))).toBe(true);
		expect(floors.has(junk(0))).toBe(false);
	});

	test('every live key in a default cache keeps its floor through an outage', async () => {
		const cache = createManifestCache();
		const fetchSpy = vi.fn(staleOnArrival);
		const key = (index: number) => `${URL_UNDER_TEST}?language=t${index}`;
		// 128 tenants (the default cache cap), each stale-served once.
		for (let index = 0; index < 128; index += 1) {
			const now = 1000 + index;
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await fetchThroughRuntime({
				cache,
				fetch: fetchSpy,
				now,
				sourceURL: key(index),
			});
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await fetchThroughRuntime({
				cache,
				fetch: fetchSpy,
				now: now + 1,
				sourceURL: key(index),
			});
		}
		await flush();
		const floors = readRevalidationFloors(cache);
		for (let index = 0; index < 128; index += 1) {
			expect(floors.has(key(index))).toBe(true);
		}
		// Round-robin stale reads inside the floor start no new fills.
		const before = fetchSpy.mock.calls.length;
		for (let index = 0; index < 128; index += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await fetchThroughRuntime({
				cache,
				fetch: fetchSpy,
				now: 2000 + index,
				sourceURL: key(index),
			});
		}
		expect(fetchSpy.mock.calls.length).toBe(before);
	});

	test('a blocking fill that lands fresh clears a floor left by a failed refresh', async () => {
		// `s-maxage=1, stale-while-revalidate=1`: the stale window closes
		// before the five-second floor does, so the next read blocks. Its
		// fresh result must not inherit the old floor, or the refreshed
		// entry would go stale again and be served without a refresh.
		const cache = createManifestCache();
		let requests = 0;
		const fetchSpy = vi.fn(() => {
			requests += 1;
			if (requests === 2) {
				return Promise.reject(new Error('upstream blip'));
			}
			return Promise.resolve(
				jsonResponse({
					'cache-control': 'public, s-maxage=1, stale-while-revalidate=1',
					etag: '"r1"',
				})
			);
		});

		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 0,
			sourceURL: URL_UNDER_TEST,
		});
		// Stale at 1.5 s: background refresh fails, floor set to about 6.5 s.
		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 1500,
			sourceURL: URL_UNDER_TEST,
		});
		await flush();
		expect(readRevalidationFloors(cache).has(URL_UNDER_TEST)).toBe(true);

		// Past staleUntil (2 s): blocks, lands fresh (expires 4 s).
		const fresh = await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 3000,
			sourceURL: URL_UNDER_TEST,
		});
		expect(fresh.expiresAt).toBe(4000);
		expect(readRevalidationFloors(cache).has(URL_UNDER_TEST)).toBe(false);

		// Stale again at 4.5 s, still inside the old 6.5 s floor: a background
		// refresh must start.
		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 4500,
			sourceURL: URL_UNDER_TEST,
		});
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
	});

	test('a fresh replacement clears the floor; a stale one keeps it', async () => {
		const cache = createManifestCache();
		let requests = 0;
		const fetchSpy = vi.fn(() => {
			requests += 1;
			return Promise.resolve(
				jsonResponse({
					// First fill and first refresh are fresh; the third answer is
					// already stale (a CDN serving stale with a large Age).
					age: requests === 3 ? '90' : '0',
					'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
					etag: '"r1"',
				})
			);
		});

		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 0,
			sourceURL: URL_UNDER_TEST,
		});
		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 61_000,
			sourceURL: URL_UNDER_TEST,
		});
		await flush();
		expect(readRevalidationFloors(cache).has(URL_UNDER_TEST)).toBe(false);

		await fetchThroughRuntime({
			cache,
			fetch: fetchSpy,
			now: 122_000,
			sourceURL: URL_UNDER_TEST,
		});
		await flush();
		const floor = readRevalidationFloors(cache).get(URL_UNDER_TEST);
		expect(floor).toBeGreaterThanOrEqual(
			122_000 + MANIFEST_DEDUPE_TTL_SECONDS * 1000
		);
	});
});
