/**
 * The cache adapters.
 *
 * These shipped in `@c15t/backend` with no tests at all, which is how the
 * shared module-level `Map` in the memory adapter went unremarked: two
 * instances in one process see each other's entries, and a test that sets a
 * key leaks it into the next one. That is defensible for a process-wide cache
 * and surprising if you have not read the source, so it is pinned here.
 *
 * The adapters are behaviourally simple. What is worth asserting is the part
 * that is easy to get wrong and invisible when wrong: expiry, and the
 * `null`-versus-`undefined` distinction that tells a cache miss from a cached
 * absence.
 */

import { afterEach, assert, describe, it } from '@effect/vitest';

import {
	clearMemoryCache,
	createCacheKey,
	createCloudflareKVAdapter,
	createGVLCacheKey,
	createMemoryCacheAdapter,
	createUpstashRedisAdapterFromClient,
	getMemoryCacheSize,
} from './index';
import type { KVNamespace } from './index';

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

afterEach(() => {
	// Shared module state; without this each test inherits the last one's keys.
	clearMemoryCache();
});

describe('memory adapter', () => {
	it('round-trips a value', async () => {
		const cache = createMemoryCacheAdapter();
		await cache.set('k', { hello: 'world' });

		assert.deepStrictEqual(await cache.get('k'), { hello: 'world' });
		assert.isTrue(await cache.has('k'));
	});

	it('reports a miss as null', async () => {
		const cache = createMemoryCacheAdapter();

		// `null`, not `undefined`: callers distinguish "not cached" from a cached
		// value that happens to be undefined.
		assert.isNull(await cache.get('absent'));
		assert.isFalse(await cache.has('absent'));
	});

	it('expires an entry once its ttl has passed', async () => {
		const cache = createMemoryCacheAdapter();
		await cache.set('k', 'v', 1);

		await createDeferredPromise((resolve) => setTimeout(resolve, 5));

		// Lazy expiry: the entry is still in the Map, and `get` has to notice.
		assert.isNull(await cache.get('k'));
		assert.isFalse(await cache.has('k'));
	});

	it('deletes', async () => {
		const cache = createMemoryCacheAdapter();
		await cache.set('k', 'v');
		await cache.delete('k');

		assert.isNull(await cache.get('k'));
	});

	it('shares state between instances in one process', async () => {
		const first = createMemoryCacheAdapter();
		const second = createMemoryCacheAdapter();

		await first.set('shared', 'yes');

		// Deliberate, and worth knowing: the Map is module-level, so this is a
		// process-wide cache rather than a per-instance one.
		assert.strictEqual(await second.get('shared'), 'yes');
		assert.strictEqual(getMemoryCacheSize(), 1);
	});
});

describe('cache keys', () => {
	it('sorts vendor ids so key order cannot vary', () => {
		// The same vendor set requested in a different order has to hit the same
		// entry, or the cache silently never hits.
		assert.strictEqual(
			createGVLCacheKey('app', 'en', [10, 1, 2]),
			createGVLCacheKey('app', 'en', [1, 2, 10])
		);
		assert.strictEqual(
			createGVLCacheKey('app', 'en', [1, 2, 10]),
			'app:gvl:en:1,2,10'
		);
	});

	it('distinguishes all-vendors from a specific set', () => {
		assert.strictEqual(createGVLCacheKey('app', 'en'), 'app:gvl:en:all');
	});

	it('namespaces by app so two tenants cannot collide', () => {
		assert.notStrictEqual(
			createCacheKey('app-a', 'translations', 'en'),
			createCacheKey('app-b', 'translations', 'en')
		);
		assert.strictEqual(
			createCacheKey('app', 'translations', 'en', 'banner'),
			'app:translations:en:banner'
		);
	});
});

/**
 * The two remote adapters, against fakes.
 *
 * Both were ported with no tests, and both convert between this package's
 * milliseconds and their backend's own unit — the kind of arithmetic that is
 * silently wrong by a factor of a thousand and only shows up as a cache that
 * never hits, or one that never expires.
 */
describe('cloudflare KV adapter', () => {
	const fakeKv = () => {
		const store = new Map<string, string>();
		const puts: { key: string; ttl?: number }[] = [];
		// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
		const kv: KVNamespace = {
			// Real KV parses when asked for `type: 'json'` and returns the raw
			// string otherwise; the adapter relies on both halves of that.
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			get: async (key, options) => {
				const raw = store.get(key);
				if (raw === undefined) {
					return null;
				}
				return options?.type === 'json' ? JSON.parse(raw) : raw;
			},
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			put: async (key, value, options) => {
				store.set(key, value);
				puts.push({ key, ttl: options?.expirationTtl });
			},
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			delete: async (key) => {
				store.delete(key);
			},
		};
		return { kv, puts, store };
	};

	it('round-trips a value as JSON', async () => {
		const { kv, store } = fakeKv();
		const cache = createCloudflareKVAdapter(kv);

		await cache.set('k', { hello: 'world' });

		// KV stores strings; the adapter owns the serialisation.
		assert.strictEqual(store.get('k'), JSON.stringify({ hello: 'world' }));
		assert.deepStrictEqual(await cache.get('k'), { hello: 'world' });
	});

	it('converts the ttl from milliseconds to seconds', async () => {
		const { kv, puts } = fakeKv();
		await createCloudflareKVAdapter(kv).set('k', 'v', 60_000);

		// KV counts seconds. Passing milliseconds straight through would ask for
		// a 60,000-second entry — sixteen hours instead of a minute.
		assert.strictEqual(puts[0]?.ttl, 60);
	});

	it('reports a miss as null and deletes', async () => {
		const { kv } = fakeKv();
		const cache = createCloudflareKVAdapter(kv);

		assert.isNull(await cache.get('absent'));
		assert.isFalse(await cache.has('absent'));

		await cache.set('k', 'v');
		assert.isTrue(await cache.has('k'));
		await cache.delete('k');
		assert.isNull(await cache.get('k'));
	});
});

describe('upstash redis adapter', () => {
	const fakeRedis = () => {
		const store = new Map<string, unknown>();
		const sets: { key: string; ex?: number }[] = [];
		const client = {
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			del: async (key: string) => {
				store.delete(key);
			},
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			exists: async (key: string) => (store.has(key) ? 1 : 0),
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			get: async <T>(key: string) => (store.get(key) ?? null) as T | null,
			// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
			set: async <T>(key: string, value: T, options?: { ex?: number }) => {
				store.set(key, value);
				sets.push({ ex: options?.ex, key });
			},
		};
		return { client, sets };
	};

	it('round-trips a value', async () => {
		const { client } = fakeRedis();
		const cache = createUpstashRedisAdapterFromClient(
			client as unknown as Parameters<
				typeof createUpstashRedisAdapterFromClient
			>[0]
		);

		await cache.set('k', { hello: 'world' });
		assert.deepStrictEqual(await cache.get('k'), { hello: 'world' });
		assert.isTrue(await cache.has('k'));
	});

	it('converts the ttl from milliseconds to seconds', async () => {
		const { client, sets } = fakeRedis();
		const cache = createUpstashRedisAdapterFromClient(
			client as unknown as Parameters<
				typeof createUpstashRedisAdapterFromClient
			>[0]
		);

		await cache.set('k', 'v', 60_000);
		// Redis EX counts seconds.
		assert.strictEqual(sets[0]?.ex, 60);

		// And rounds up rather than to zero, which would mean "no expiry".
		await cache.set('k2', 'v', 1);
		assert.strictEqual(sets[1]?.ex, 1);
	});

	it('reports a miss as null and deletes', async () => {
		const { client } = fakeRedis();
		const cache = createUpstashRedisAdapterFromClient(
			client as unknown as Parameters<
				typeof createUpstashRedisAdapterFromClient
			>[0]
		);

		assert.isNull(await cache.get('absent'));
		assert.isFalse(await cache.has('absent'));

		await cache.set('k', 'v');
		await cache.delete('k');
		assert.isFalse(await cache.has('k'));
	});
});
