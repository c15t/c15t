/**
 * Cloudflare KV Cache Adapter
 *
 * Cache adapter for Cloudflare Workers KV storage.
 *
 * @packageDocumentation
 */

import type { CacheAdapter } from '../types';
import { GVL_TTL_MS } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cloudflare KV Namespace interface.
 * Matches the KVNamespace type from @cloudflare/workers-types.
 *
 * @public
 */
export interface KVNamespace {
	get(key: string, options?: { type?: 'text' | 'json' }): Promise<unknown>;
	put(
		key: string,
		value: string,
		options?: { expirationTtl?: number }
	): Promise<void>;
	delete(key: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Cloudflare KV cache adapter.
 *
 * @param kv - Cloudflare KV namespace binding
 * @returns A CacheAdapter backed by Cloudflare KV
 *
 * @example
 * ```typescript
 * // In your Cloudflare Worker
 * export default {
 *   async fetch(request, env) {
 *     const kvAdapter = createCloudflareKVAdapter(env.GVL_CACHE);
 *
 *     await kvAdapter.set('key', { data: 'value' }, 3600000);
 *     const value = await kvAdapter.get('key');
 *   }
 * };
 * ```
 *
 * @public
 */
export function createCloudflareKVAdapter(kv: KVNamespace): CacheAdapter {
	return {
		async get<T>(key: string): Promise<T | null> {
			const value = await kv.get(key, { type: 'json' });
			return value as T | null;
		},

		async set<T>(key: string, value: T, ttlMs = GVL_TTL_MS): Promise<void> {
			// Convert milliseconds to seconds for KV expirationTtl
			const ttlSeconds = Math.ceil(ttlMs / 1000);
			await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
		},

		async delete(key: string): Promise<void> {
			await kv.delete(key);
		},

		async has(key: string): Promise<boolean> {
			const value = await kv.get(key);
			return value !== null;
		},
	};
}
