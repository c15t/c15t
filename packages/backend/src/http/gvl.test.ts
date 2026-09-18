/**
 * GVL resolution.
 *
 * The behaviours worth testing are the failure and contention ones: this sits
 * on the critical rendering path, calls a third party, and is hit by every
 * concurrent visitor at once when a cache goes cold.
 */

import { assert, describe, it } from 'vitest';

import { gvlCacheKey, resolveGvl } from './gvl';
import type { CacheAdapter } from './gvl';

/** Minimal document satisfying `globalVendorListSchema`. */
const GVL = {
	features: {},
	gvlSpecificationVersion: 3,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {},
	specialFeatures: {},
	specialPurposes: {},
	stacks: {},
	tcfPolicyVersion: 4,
	vendorListVersion: 1,
	vendors: {},
};

const memoryCache = (): CacheAdapter & { entries: Map<string, unknown> } => {
	const entries = new Map<string, unknown>();
	return {
		delete: (key) => {
			entries.delete(key);
		},
		entries,
		get: <T>(key: string) => (entries.get(key) as T) ?? null,
		has: (key) => entries.has(key),
		set: (key, value) => {
			entries.set(key, value);
		},
	};
};

const respondWith = (body: unknown, ok = true) =>
	(() =>
		new Response(JSON.stringify(body), {
			status: ok ? 200 : 500,
		})) as unknown as typeof globalThis.fetch;

/** A vendor entry complete enough for `gvlVendorSchema`. */
const vendor = (id: number) => ({
	cookieMaxAgeSeconds: null,
	cookieRefresh: false,
	features: [],
	flexiblePurposes: [],
	id,
	legIntPurposes: [],
	name: `Vendor ${id}`,
	purposes: [1],
	specialFeatures: [],
	specialPurposes: [],
	urls: [],
	usesCookies: false,
	usesNonCookieAccess: false,
});

/** A fetch stub that answers with `body` and records the URL it was called with. */
const recordUrl = (body: unknown) => {
	const urls: string[] = [];
	const fetchImpl = ((input: RequestInfo | URL) => {
		urls.push(String(input));
		return Promise.resolve(new Response(JSON.stringify(body)));
	}) as unknown as typeof globalThis.fetch;
	return { fetchImpl, urls };
};

describe('gvl cache key', () => {
	it('treats a reordered vendor list as the same list', () => {
		// The same set in a different order is the same document; separate keys
		// would multiply entries and miss rates for nothing.
		assert.strictEqual(
			gvlCacheKey('https://e', 'en', [3, 1, 2]),
			gvlCacheKey('https://e', 'en', [1, 2, 3])
		);
	});

	it('separates languages and endpoints', () => {
		assert.notStrictEqual(
			gvlCacheKey('https://e', 'en', undefined),
			gvlCacheKey('https://e', 'de', undefined)
		);
		assert.notStrictEqual(
			gvlCacheKey('https://a', 'en', undefined),
			gvlCacheKey('https://b', 'en', undefined)
		);
	});
});

describe('resolveGvl', () => {
	it('fetches and caches', async () => {
		const cache = memoryCache();
		let calls = 0;
		const fetchOnce = (() => {
			calls += 1;
			return new Response(JSON.stringify(GVL));
		}) as unknown as typeof globalThis.fetch;

		const first = await resolveGvl('en', { cache, fetch: fetchOnce });
		const second = await resolveGvl('en', { cache, fetch: fetchOnce });

		assert.isNotNull(first);
		assert.deepStrictEqual(second, first);
		assert.strictEqual(calls, 1, 'second call should be served from cache');
	});

	it('treats a regional tag as its primary subtag', async () => {
		const cache = memoryCache();
		await resolveGvl('de-DE', { cache, fetch: respondWith(GVL) });
		// 'de-DE' and 'de' are the same published document.
		assert.isTrue(
			cache.entries.has(gvlCacheKey('https://gvl.inth.app', 'de', undefined))
		);
	});

	it('returns null rather than throwing when the upstream fails', async () => {
		// A missing GVL degrades the IAB experience; a thrown error would fail
		// /init entirely and leave the visitor with no consent UI at all.
		assert.isNull(await resolveGvl('en', { fetch: respondWith(GVL, false) }));
		assert.isNull(
			await resolveGvl('en', {
				fetch: (() => {
					throw new Error('network down');
				}) as unknown as typeof globalThis.fetch,
			})
		);
	});

	it('rejects and does not cache a malformed document', async () => {
		const cache = memoryCache();
		const result = await resolveGvl('en', {
			cache,
			fetch: respondWith({ nonsense: true }),
		});

		assert.isNull(result);
		// Caching a malformed document would persist the upstream's mistake.
		assert.strictEqual(cache.entries.size, 0);
	});

	it('shares one fetch across concurrent misses', async () => {
		const cache = memoryCache();
		let calls = 0;
		const slow = (async () => {
			calls += 1;
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
			return new Response(JSON.stringify(GVL));
		}) as unknown as typeof globalThis.fetch;

		// A cold cache under load means every request misses at once. Without
		// in-flight sharing they would each fetch the same large document.
		const results = await Promise.all([
			resolveGvl('fr', { cache, fetch: slow }),
			resolveGvl('fr', { cache, fetch: slow }),
			resolveGvl('fr', { cache, fetch: slow }),
		]);

		assert.strictEqual(calls, 1);
		for (const result of results) {
			assert.isNotNull(result);
		}
	});

	it('requests the document at the endpoint itself', async () => {
		// The upstream serves the list at its root and answers `/en.json` with a
		// 404, so a per-language path silently means every IAB deployment gets
		// no GVL at all. This is the assertion that let that ship.
		const { fetchImpl, urls } = recordUrl(GVL);
		await resolveGvl('de-DE', { fetch: fetchImpl });

		assert.deepEqual(urls, ['https://gvl.inth.app']);
	});

	it('sends a scoped allowlist as a server-side filter', async () => {
		// Its own endpoint: `inflight` is module-scoped, and a request that
		// shares a cache key with one another test made this one observe a
		// promise instead of its own fetch.
		const { fetchImpl, urls } = recordUrl(GVL);
		await resolveGvl('en', {
			endpoint: 'https://gvl-filter.test',
			fetch: fetchImpl,
			vendorIds: [3, 1, 2],
		});

		// Sorted, so one allowlist is one cache key and one upstream URL.
		assert.match(
			urls[0] ?? '',
			/^https:\/\/gvl-filter\.test\?vendorIds=1(?:%2C|,)2(?:%2C|,)3$/u
		);
	});

	it('narrows an allowlist too wide for a request line, locally', async () => {
		// Above the query cap the upstream gets no filter and returns every
		// vendor. The filter still has to happen: handing a visitor the full GVL
		// because a publisher scoped wide would disclose partners nobody asked
		// to disclose, and the narrowed document is what belongs in the cache.
		const wide = [1, ...Array.from({ length: 500 }, (_, i) => i + 1000)];
		const doc = {
			...GVL,
			vendors: { 1: vendor(1), 2: vendor(2), 3: vendor(3) },
		};
		const cache = memoryCache();
		const { fetchImpl, urls } = recordUrl(doc);

		const result = await resolveGvl('en', {
			cache,
			endpoint: 'https://gvl-wide.test',
			fetch: fetchImpl,
			vendorIds: wide,
		});

		assert.notMatch(urls[0] ?? '', /vendorIds/u);
		assert.deepStrictEqual(Object.keys(result?.vendors ?? {}), ['1']);
		assert.deepStrictEqual(
			Object.keys(
				(
					cache.entries.get(
						gvlCacheKey('https://gvl-wide.test', 'en', wide)
					) as { vendors: Record<string, unknown> }
				).vendors ?? {}
			),
			['1']
		);
	});

	it('passes an unscoped request through unfiltered', async () => {
		const { fetchImpl, urls } = recordUrl(GVL);
		const result = await resolveGvl('en', {
			endpoint: 'https://gvl-unscoped.test',
			fetch: fetchImpl,
			vendorIds: [],
		});

		assert.deepEqual(urls, ['https://gvl-unscoped.test']);
		assert.deepStrictEqual(result?.vendors, {});
	});
});
