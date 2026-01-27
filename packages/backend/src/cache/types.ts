/**
 * Cache Adapter Types
 *
 * Generic cache adapter interface for pluggable caching implementations.
 * Supports in-memory, Redis, Cloudflare KV, and custom adapters.
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Cache Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic cache adapter interface.
 *
 * Implementations should handle serialization/deserialization internally.
 * All methods are async to support both sync (memory) and async (Redis/KV) backends.
 *
 * @public
 */
export interface CacheAdapter {
	/**
	 * Get a value from the cache.
	 *
	 * @param key - Cache key
	 * @returns The cached value, or null if not found or expired
	 */
	get<T>(key: string): Promise<T | null>;

	/**
	 * Set a value in the cache.
	 *
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param ttlMs - Time to live in milliseconds (optional)
	 */
	set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

	/**
	 * Delete a value from the cache.
	 *
	 * @param key - Cache key
	 */
	delete(key: string): Promise<void>;

	/**
	 * Check if a key exists in the cache.
	 *
	 * @param key - Cache key
	 * @returns True if the key exists and is not expired
	 */
	has(key: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default TTL for GVL cache entries (3 days).
 * Matches the typical GVL update frequency.
 *
 * @public
 */
export const GVL_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Default TTL for in-memory cache entries (5 minutes).
 * Shorter TTL to handle worker restarts and keep memory usage low.
 *
 * @public
 */
export const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
