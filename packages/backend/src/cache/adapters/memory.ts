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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry<T = unknown> {
	value: T;
	expiresAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-Level Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Module-level cache shared across requests in the same worker/process.
 * This provides fast 0ms access for repeated requests.
 */
const memoryCache = new Map<string, CacheEntry>();

// ─────────────────────────────────────────────────────────────────────────────
// Cache Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

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
export function createMemoryCacheAdapter(): CacheAdapter {
	return {
		async get<T>(key: string): Promise<T | null> {
			const entry = memoryCache.get(key);

			if (!entry) {
				return null;
			}

			// Check if entry has expired (lazy expiration)
			if (Date.now() > entry.expiresAt) {
				memoryCache.delete(key);
				return null;
			}

			return entry.value as T;
		},

		async set<T>(key: string, value: T, ttlMs = MEMORY_TTL_MS): Promise<void> {
			memoryCache.set(key, {
				value,
				expiresAt: Date.now() + ttlMs,
			});
		},

		async delete(key: string): Promise<void> {
			memoryCache.delete(key);
		},

		async has(key: string): Promise<boolean> {
			const entry = memoryCache.get(key);

			if (!entry) {
				return false;
			}

			// Check if entry has expired
			if (Date.now() > entry.expiresAt) {
				memoryCache.delete(key);
				return false;
			}

			return true;
		},
	};
}

/**
 * Clears the entire in-memory cache.
 * Primarily used for testing.
 *
 * @public
 */
export function clearMemoryCache(): void {
	memoryCache.clear();
}

/**
 * Gets the current size of the in-memory cache.
 * Primarily used for debugging and monitoring.
 *
 * @returns The number of entries in the cache (may include expired entries)
 *
 * @public
 */
export function getMemoryCacheSize(): number {
	return memoryCache.size;
}
