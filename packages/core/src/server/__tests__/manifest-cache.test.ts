/**
 * `fetchCachedManifest` — reuse, revalidation, and the limits on both.
 */
import type { ConsentManifest } from '@c15t/schema/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
	clearManifestCache,
	fetchCachedManifest,
	MANIFEST_DEDUPE_TTL_SECONDS,
} from '../manifest-cache';

const manifest = { policy: { id: 'p1' } } as unknown as ConsentManifest;

const jsonResponse = function jsonResponse(
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(manifest), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});
};

beforeEach(() => {
	clearManifestCache();
});

describe('fetchCachedManifest', () => {
	test('reuses a fresh entry instead of asking again', async () => {
		const fetchImpl = vi
			.fn()
			.mockImplementation(() => Promise.resolve(jsonResponse()));

		await fetchCachedManifest({
			config: { manifestURL: 'https://api.test/manifest' },
			fetch: fetchImpl,
			now: 0,
		});
		await fetchCachedManifest({
			config: { manifestURL: 'https://api.test/manifest' },
			fetch: fetchImpl,
			now: (MANIFEST_DEDUPE_TTL_SECONDS - 1) * 1000,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	test('does not keep a response the backend marked private', async () => {
		const fetchImpl = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(
					jsonResponse({ 'cache-control': 'private, s-maxage=60' })
				)
			);

		await fetchCachedManifest({
			config: { manifestURL: 'https://api.test/manifest' },
			fetch: fetchImpl,
			now: 0,
		});
		await fetchCachedManifest({
			config: { manifestURL: 'https://api.test/manifest' },
			fetch: fetchImpl,
			now: 1000,
		});

		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	test('collapses a concurrent burst into one upstream request', async () => {
		const gate = Promise.withResolvers<null>();
		const fetchImpl = vi.fn().mockImplementation(async () => {
			await gate.promise;
			return jsonResponse();
		});

		const calls = Array.from({ length: 5 }, () =>
			fetchCachedManifest({
				config: { manifestURL: 'https://api.test/manifest' },
				fetch: fetchImpl,
				now: 0,
			})
		);
		gate.resolve(null);
		const results = await Promise.all(calls);

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(
			results.every((result) => result.manifest === results[0]?.manifest)
		).toBe(true);
	});

	test('does not grow without bound as the query varies', async () => {
		const fetchImpl = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(jsonResponse({ 'cache-control': 's-maxage=3600' }))
			);

		for (let i = 0; i < 200; i += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential on purpose: each entry has to land before the next.
			await fetchCachedManifest({
				config: { manifestURL: 'https://api.test/manifest' },
				fetch: fetchImpl,
				now: 0,
				query: `language=l${i}`,
			});
		}

		// The first key was evicted long ago, so asking for it again is a miss.
		const before = fetchImpl.mock.calls.length;
		await fetchCachedManifest({
			config: { manifestURL: 'https://api.test/manifest' },
			fetch: fetchImpl,
			now: 0,
			query: 'language=l0',
		});
		expect(fetchImpl.mock.calls.length).toBe(before + 1);
	});
});
