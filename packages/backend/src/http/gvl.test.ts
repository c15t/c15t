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

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
}

/** Minimal document satisfying `globalVendorListSchema`. */
const GVL = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 1,
	tcfPolicyVersion: 4,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {},
	specialPurposes: {},
	features: {},
	specialFeatures: {},
	stacks: {},
	vendors: {},
};

const memoryCache = (): CacheAdapter & { entries: Map<string, unknown> } => {
	const entries = new Map<string, unknown>();
	return {
		entries,
		get: async <T>(key: string) => (entries.get(key) as T) ?? null,
		set: async (key, value) => {
			entries.set(key, value);
		},
		delete: async (key) => {
			entries.delete(key);
		},
		has: async (key) => entries.has(key),
	};
};

const respondWith = (body: unknown, ok = true) =>
	(async () =>
		new Response(JSON.stringify(body), {
			status: ok ? 200 : 500,
		})) as unknown as typeof globalThis.fetch;

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
		const fetchOnce = (async () => {
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
				fetch: (async () => {
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
			await createDeferredPromise((resolve) => setTimeout(resolve, 20));
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
});
