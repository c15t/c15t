import { describe, expect, test } from 'vitest';

import type { CachedManifestResponse } from '../transports/manifest-cache';
import { createManifestCache } from '../transports/manifest-cache';

const entry = function entry(expiresAt: number): CachedManifestResponse {
	return {
		expiresAt,
		fetchedAt: 0,
		headers: {},
		manifest: {} as CachedManifestResponse['manifest'],
		sMaxAge: 0,
		upstreamAge: 0,
	};
};

const FUTURE = Date.now() + 60_000;

describe('createManifestCache bounds', () => {
	test('evicts the least recently used entry once maxEntries is reached', () => {
		const cache = createManifestCache({ maxEntries: 2 });
		cache.set('a', entry(FUTURE));
		cache.set('b', entry(FUTURE));
		// Touch `a` so `b` becomes the oldest.
		cache.get('a');
		cache.set('c', entry(FUTURE));

		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBeDefined();
		expect(cache.get('c')).toBeDefined();
	});

	test('drops expired entries before live ones', () => {
		const cache = createManifestCache({ maxEntries: 2 });
		cache.set('live', entry(FUTURE));
		cache.set('stale', entry(Date.now() - 1));
		cache.set('fresh', entry(FUTURE));

		expect(cache.get('stale')).toBeUndefined();
		expect(cache.get('live')).toBeDefined();
	});

	test('overwriting a key never evicts another', () => {
		const cache = createManifestCache({ maxEntries: 2 });
		cache.set('a', entry(FUTURE));
		cache.set('b', entry(FUTURE));
		cache.set('a', entry(FUTURE + 1));

		expect(cache.get('b')).toBeDefined();
	});

	test('a flood of distinct keys stays within the cap', () => {
		const cache = createManifestCache({ maxEntries: 8 });
		for (let index = 0; index < 1000; index += 1) {
			cache.set(
				`https://c.example/manifest?language=aa-${index}`,
				entry(FUTURE)
			);
		}
		let size = 0;
		for (let index = 992; index < 1000; index += 1) {
			if (cache.get(`https://c.example/manifest?language=aa-${index}`)) {
				size += 1;
			}
		}
		expect(size).toBe(8);
		expect(
			cache.get('https://c.example/manifest?language=aa-0')
		).toBeUndefined();
	});
});
