import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
	clearManifestCache,
	fetchCachedManifest,
	MANIFEST_DEDUPE_TTL_SECONDS,
	resolveManifestCacheTtlSeconds,
} from '../manifest-cache';

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
});
