/**
 * In-Memory Cache Adapter
 *
 * A simple Map-based cache adapter with TTL support.
 * Used as the default first layer in the cache resolution chain.
 *
 * @packageDocumentation
 */

import type { CacheAdapter } from '../types';
import { MEMORY_TTL_MS } from '../types';

interface CacheEntry<T = unknown> {
	value: T;
	expiresAt: number;
}

/**
 * Module-level cache shared across requests in the same worker/process.
 * This provides fast 0ms access for repeated requests.
 */
const memoryCache = new Map<string, CacheEntry>();

/**
 * Creates an in-memory cache adapter.
 *
 * Features:
 * - Uses a shared Map for fast access
 * - Supports TTL with lazy expiration
 * - Always used as the first cache layer by default
 *
 * @returns A CacheAdapter implementation backed by in-memory Map
 *
 * @example
 * ```typescript
 * const memoryAdapter = createMemoryCacheAdapter();
 *
 * await memoryAdapter.set('key', { data: 'value' }, 60000); // 1 minute TTL
 * const value = await memoryAdapter.get('key');
 * ```
 *
 * @public
 */
export const createMemoryCacheAdapter =
	function createMemoryCacheAdapter(): CacheAdapter {
		return {
			delete(key: string): Promise<void> {
				memoryCache.delete(key);
				return Promise.resolve();
			},

			get<T>(key: string): Promise<T | null> {
				const entry = memoryCache.get(key);

				if (!entry) {
					return Promise.resolve(null);
				}

				// Check if entry has expired (lazy expiration)
				if (Date.now() > entry.expiresAt) {
					memoryCache.delete(key);
					return Promise.resolve(null);
				}

				return Promise.resolve(entry.value as T);
			},

			has(key: string): Promise<boolean> {
				const entry = memoryCache.get(key);

				if (!entry) {
					return Promise.resolve(false);
				}

				// Check if entry has expired
				if (Date.now() > entry.expiresAt) {
					memoryCache.delete(key);
					return Promise.resolve(false);
				}

				return Promise.resolve(true);
			},

			set<T>(key: string, value: T, ttlMs = MEMORY_TTL_MS): Promise<void> {
				memoryCache.set(key, {
					expiresAt: Date.now() + ttlMs,

					value,
				});
				return Promise.resolve();
			},
		};
	};

/**
 * Clears the entire in-memory cache.
 * Primarily used for testing.
 *
 * @public
 */
export const clearMemoryCache = function clearMemoryCache(): void {
	memoryCache.clear();
};

/**
 * Gets the current size of the in-memory cache.
 * Primarily used for debugging and monitoring.
 *
 * @returns The number of entries in the cache (may include expired entries)
 *
 * @public
 */
export const getMemoryCacheSize = function getMemoryCacheSize(): number {
	return memoryCache.size;
};
