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
	createGVLCacheKey,
	createMemoryCacheAdapter,
	getMemoryCacheSize,
} from './index';

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

		await new Promise((resolve) => setTimeout(resolve, 5));

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
