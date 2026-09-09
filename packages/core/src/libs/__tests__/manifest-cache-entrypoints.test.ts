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
