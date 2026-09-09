import { afterEach, describe, expect, test, vi } from 'vitest';

import * as server from '../../server/manifest-cache';
import * as transport from '../../transports/manifest-cache';
import * as legacy from '../manifest-cache';

const url = 'https://api.test/manifest';
const response = (headers: Record<string, string>, revision = 1) =>
	Response.json({ revision }, { headers });

const entrypoints = [
	{
		clear: server.clearManifestCache,
		fetch: (fetch: typeof globalThis.fetch, now: number) =>
			server.fetchCachedManifest({ config: { manifestURL: url }, fetch, now }),
		name: 'server',
	},
	{
		clear: transport.clearManifestCache,
		fetch: (fetch: typeof globalThis.fetch, now: number) =>
			transport.fetchCachedManifest({ fetch, now, sourceURL: url }),
		name: 'transport',
	},
	{
		clear: legacy.clearManifestCache,
		fetch: (fetch: typeof globalThis.fetch, now: number) =>
			legacy.fetchCachedManifest({ fetch, now, url }),
		name: 'legacy',
	},
];

test('the server entrypoint rejects invalid configuration asynchronously', async () => {
	await expect(server.fetchCachedManifest({ config: {} })).rejects.toThrow();
});

describe.each(entrypoints)('$name manifest cache', (entrypoint) => {
	afterEach(() => entrypoint.clear());
	test('subtracts upstream age from the remaining lifetime', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(() =>
				Promise.resolve(response({ age: '55', 'cache-control': 's-maxage=60' }))
			);
		const first = await entrypoint.fetch(fetch, 1000);
		expect(first.expiresAt).toBe(6000);
		await entrypoint.fetch(fetch, 5999);
		expect(fetch).toHaveBeenCalledTimes(1);
		await entrypoint.fetch(fetch, 6000);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	test('does not reuse explicit zero-lifetime responses', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(() =>
				Promise.resolve(response({ 'cache-control': 's-maxage=0' }))
			);
		await entrypoint.fetch(fetch, 1000);
		await entrypoint.fetch(fetch, 1001);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	test('drops the old Age after successful revalidation', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValueOnce(
				response({ age: '55', 'cache-control': 's-maxage=60', etag: 'v1' })
			)
			.mockResolvedValueOnce(new Response(null, { status: 304 }));
		await entrypoint.fetch(fetch, 1000);
		const refreshed = await entrypoint.fetch(fetch, 6000);
		expect(refreshed.expiresAt).toBe(66000);
		expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({
			'if-none-match': 'v1',
		});
	});
});

test('the legacy entrypoint retains framework fetch options and partitions credentials', async () => {
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockImplementation(() =>
			Promise.resolve(response({ 'cache-control': 's-maxage=60' }))
		);
	for (const token of ['tenant-a', 'tenant-b']) {
		// oxlint-disable-next-line no-await-in-loop -- Test credential isolation after the previous cache fill completes.
		await legacy.fetchCachedManifest({
			fetch,
			headers: { authorization: token },
			init: { cache: 'no-store' },
			now: 0,
			url,
		});
	}
	expect(fetch).toHaveBeenCalledTimes(2);
	expect(fetch.mock.calls[0]?.[1]).toMatchObject({
		cache: 'no-store',
		headers: { authorization: 'tenant-a' },
	});
	legacy.clearManifestCache();
});

describe('manifest fetch protection', () => {
	afterEach(() => {
		transport.clearManifestCache();
		vi.useRealTimers();
	});

	test.each(['authorization', 'x-api-key'])(
		'rejects redirects when forwarding %s',
		async (header) => {
			const fetch = vi
				.fn<typeof globalThis.fetch>()
				.mockResolvedValue(response({}));
			await transport.fetchCachedManifest({
				fetch,
				headers: { [header]: 'secret' },
				init: { redirect: 'follow' },
				sourceURL: url,
			});
			expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' });
		}
	);

	test('preserves redirect handling for public requests', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValue(response({}));
		await transport.fetchCachedManifest({
			fetch,
			headers: { 'accept-language': 'en' },
			init: { redirect: 'follow' },
			sourceURL: url,
		});
		expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'follow' });
	});

	test('times out a stalled shared fetch and allows a later request to retry', async () => {
		vi.useFakeTimers();
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementationOnce(
				(_url, init) =>
					new Promise((_resolve, reject) => {
						init?.signal?.addEventListener(
							'abort',
							() => reject(init.signal?.reason),
							{ once: true }
						);
					})
			)
			.mockResolvedValue(response({}));
		const first = transport.fetchCachedManifest({ fetch, sourceURL: url });
		const second = transport.fetchCachedManifest({ fetch, sourceURL: url });
		const rejected = Promise.all([
			expect(first).rejects.toThrow('timed out after 10 seconds'),
			expect(second).rejects.toThrow('timed out after 10 seconds'),
		]);
		await vi.advanceTimersByTimeAsync(10_000);
		await rejected;
		expect(fetch).toHaveBeenCalledTimes(1);
		await expect(
			transport.fetchCachedManifest({ fetch, sourceURL: url })
		).resolves.toMatchObject({ manifest: { revision: 1 } });
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	test('preserves caller cancellation and its deadline', async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener(
						'abort',
						() => reject(init.signal?.reason),
						{ once: true }
					);
				})
		);
		const pending = transport.fetchCachedManifest({
			fetch,
			init: { signal: controller.signal },
			sourceURL: url,
		});
		await vi.advanceTimersByTimeAsync(10_001);
		expect(fetch.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
		expect(controller.signal.aborted).toBe(false);
		const rejected = expect(pending).rejects.toThrow('caller cancelled');
		controller.abort(new Error('caller cancelled'));
		await rejected;
	});
});
