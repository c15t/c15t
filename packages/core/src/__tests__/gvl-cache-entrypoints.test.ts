import { afterEach, describe, expect, test, vi } from 'vitest';

import * as server from '../server/gvl-cache';
import * as transport from '../transports/gvl-cache';

const url = 'https://gvl.test/list';
const response = (headers: Record<string, string>, status = 200) =>
	status === 204
		? new Response(null, { headers, status })
		: Response.json({ vendorListVersion: 1 }, { headers });

describe.each([
	{ name: 'transport', ...transport },
	{ name: 'server', ...server },
])('$name GVL cache', (cache) => {
	afterEach(() => cache.clearGvlCache());
	test.each([
		'no-store',
		'private',
		'no-cache',
		'max-age=0',
		's-maxage=0, max-age=600',
		'no-store, s-maxage=600',
		'private, max-age=600',
	])('does not reuse %s responses, including 204', async (cacheControl) => {
		for (const status of [200, 204]) {
			const fetch = vi
				.fn<typeof globalThis.fetch>()
				.mockImplementation(() =>
					Promise.resolve(response({ 'cache-control': cacheControl }, status))
				);
			// oxlint-disable-next-line no-await-in-loop -- Each response must finish before checking reuse.
			await cache.fetchCachedGvl({ fetch, language: 'en', now: 0, url });
			// oxlint-disable-next-line no-await-in-loop -- Check a subsequent request, not an in-flight duplicate.
			await cache.fetchCachedGvl({ fetch, language: 'en', now: 1, url });
			expect(fetch).toHaveBeenCalledTimes(2);
		}
	});
	test('prefers s-maxage and subtracts upstream Age', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(() =>
				Promise.resolve(
					response({ age: '55', 'cache-control': 's-maxage=60, max-age=600' })
				)
			);
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 0, url });
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 4999, url });
		expect(fetch).toHaveBeenCalledTimes(1);
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 5000, url });
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	test('uses a one-day fallback without an upstream lifetime', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(() => Promise.resolve(response({})));
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 0, url });
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 86_399_999, url });
		expect(fetch).toHaveBeenCalledTimes(1);
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 86_400_000, url });
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	test('a pending fill cannot repopulate a cleared cache', async () => {
		let finish!: (response: Response) => void;
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementationOnce(
				() =>
					new Promise<Response>((resolve) => {
						finish = resolve;
					})
			)
			.mockImplementation(() =>
				Promise.resolve(response({ 'cache-control': 'max-age=600' }))
			);
		const pending = cache.fetchCachedGvl({
			fetch,
			language: 'en',
			now: 0,
			url,
		});
		cache.clearGvlCache();
		finish(response({ 'cache-control': 'max-age=600' }));
		await pending;
		await cache.fetchCachedGvl({ fetch, language: 'en', now: 1, url });
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
