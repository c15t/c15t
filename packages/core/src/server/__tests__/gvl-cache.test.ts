/**
 * The shared server-side GVL cache.
 *
 * The list runs to megabytes and every visitor in a language gets the same
 * bytes, so the interesting behaviour is all about how often it goes to the
 * network.
 */

import { afterEach, describe, expect, test } from 'vitest';

import { clearGvlCache, fetchCachedGvl } from '../gvl-cache';

const GVL_URL = 'https://vendorlist.example.com/v3/vendor-list.json';

const jsonResponse = function jsonResponse(
	body: unknown,
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});
};

afterEach(() => {
	clearGvlCache();
});

describe('fetchCachedGvl', () => {
	test('fetches the list and returns it', async () => {
		let calls = 0;
		const gvl = await fetchCachedGvl({
			fetch() {
				calls += 1;
				return Promise.resolve(jsonResponse({ vendorListVersion: 142 }));
			},
			language: 'en',
			url: GVL_URL,
		});

		expect(calls).toBe(1);
		expect(gvl).toEqual({ vendorListVersion: 142 } as never);
	});

	test('reuses the entry inside the dedupe window', async () => {
		let calls = 0;
		const fetchImpl = () => {
			calls += 1;
			return Promise.resolve(jsonResponse({ vendorListVersion: 142 }));
		};

		await fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL });
		await fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL });

		expect(calls).toBe(1);
	});

	test('collapses concurrent renders onto one download', async () => {
		let calls = 0;
		const fetchImpl = async () => {
			calls += 1;
			await Promise.resolve();
			return jsonResponse({ vendorListVersion: 142 });
		};

		await Promise.all([
			fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL }),
			fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL }),
			fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL }),
		]);

		expect(calls).toBe(1);
	});

	test('keys by language, so two locales do not share one list', async () => {
		const seen: string[] = [];
		const fetchImpl = (_url: unknown, init?: RequestInit) => {
			seen.push(
				(init?.headers as Record<string, string> | undefined)?.[
					'accept-language'
				] ?? ''
			);
			return Promise.resolve(jsonResponse({ vendorListVersion: 142 }));
		};

		await fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL });
		await fetchCachedGvl({ fetch: fetchImpl, language: 'fr', url: GVL_URL });

		expect(seen).toEqual(['en', 'fr']);
	});

	test('honours the backend s-maxage over the dedupe floor', async () => {
		let calls = 0;
		const fetchImpl = () => {
			calls += 1;
			return Promise.resolve(
				jsonResponse(
					{ vendorListVersion: 142 },
					{ 'cache-control': 's-maxage=3600' }
				)
			);
		};

		await fetchCachedGvl({
			fetch: fetchImpl,
			language: 'en',
			now: 0,
			url: GVL_URL,
		});
		// Well past the 5s dedupe floor, well inside the hour the backend gave.
		await fetchCachedGvl({
			fetch: fetchImpl,
			language: 'en',
			now: 60_000,
			url: GVL_URL,
		});

		expect(calls).toBe(1);
	});

	test('re-fetches when the backend forbids reuse', async () => {
		let calls = 0;
		const fetchImpl = () => {
			calls += 1;
			return Promise.resolve(
				jsonResponse(
					{ vendorListVersion: 142 },
					{ 'cache-control': 'no-store' }
				)
			);
		};

		await fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL });
		await fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL });

		expect(calls).toBe(2);
	});

	test('caches a 204 as "IAB is off", rather than repeating the roundtrip', async () => {
		let calls = 0;
		const fetchImpl = () => {
			calls += 1;
			return Promise.resolve(new Response(null, { status: 204 }));
		};

		const first = await fetchCachedGvl({
			fetch: fetchImpl,
			language: 'en',
			url: GVL_URL,
		});
		const second = await fetchCachedGvl({
			fetch: fetchImpl,
			language: 'en',
			url: GVL_URL,
		});

		expect(first).toBeNull();
		expect(second).toBeNull();
		expect(calls).toBe(1);
	});

	test('throws on a non-2xx, and caches nothing', async () => {
		let calls = 0;
		const fetchImpl = () => {
			calls += 1;
			return Promise.resolve(
				new Response('nope', { status: 500, statusText: 'Server Error' })
			);
		};

		await expect(
			fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL })
		).rejects.toThrow(/GVL responded 500/u);
		await expect(
			fetchCachedGvl({ fetch: fetchImpl, language: 'en', url: GVL_URL })
		).rejects.toThrow(/GVL responded 500/u);

		expect(calls).toBe(2);
	});
});
