/**
 * Upstash Redis Cache Adapter
 *
 * Cache adapter for Upstash Redis, suitable for serverless environments.
 *
 * Requires @upstash/redis to be installed as a peer dependency.
 *
 * @packageDocumentation
 */

import type { Redis } from '@upstash/redis';

import type { CacheAdapter } from '../types';
import { GVL_TTL_MS } from '../types';

/**
 * Options for creating an Upstash Redis adapter.
 *
 * @public
 */
export interface UpstashRedisAdapterOptions {
	/**
	 * Upstash Redis REST URL.
	 */
	url: string;

	/**
	 * Upstash Redis REST token.
	 */
	token: string;
}

/**
 * Creates an Upstash Redis cache adapter.
 *
 * **Note:** Requires `@upstash/redis` to be installed as a peer dependency.
 *
 * @param options - Upstash Redis connection options
 * @returns A CacheAdapter backed by Upstash Redis
 *
 * @example
 * ```typescript
 * import { createUpstashRedisAdapter } from '@c15t/backend/cache';
 *
 * const redisAdapter = createUpstashRedisAdapter({
 *   url: process.env.UPSTASH_REDIS_REST_URL,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN,
 * });
 *
 * await redisAdapter.set('key', { data: 'value' }, 3600000); // 1 hour TTL
 * const value = await redisAdapter.get('key');
 * ```
 *
 * @public
 */
export function createUpstashRedisAdapter(
	options: UpstashRedisAdapterOptions
): CacheAdapter {
	// Imported on first use rather than at module load. `@upstash/redis` is an
	// optional peer, and `./cache` re-exports this module unconditionally — so a
	// top-level import made `import '@c15t/backend/cache'` fail outright for
	// every deployment that uses only the memory adapter and never installed it.
	//
	// The factory stays synchronous because the adapter's methods are already
	// async; the client is a memoised promise the first call awaits.
	let pending: Promise<Redis> | undefined;
	const client = (): Promise<Redis> => {
		pending ??= import('@upstash/redis').then(
			(module) => new module.Redis({ url: options.url, token: options.token }),
			() => {
				throw new Error(
					'createUpstashRedisAdapter requires the optional peer dependency ' +
						'"@upstash/redis". Install it, or pass your own client to ' +
						'createUpstashRedisAdapterFromClient.'
				);
			}
		);
		return pending;
	};

	return {
		async get<T>(key: string): Promise<T | null> {
			return (await (await client()).get<T>(key)) ?? null;
		},
		async set<T>(key: string, value: T, ttlMs = GVL_TTL_MS): Promise<void> {
			await (await client()).set(key, value, { ex: Math.ceil(ttlMs / 1000) });
		},
		async delete(key: string): Promise<void> {
			await (await client()).del(key);
		},
		async has(key: string): Promise<boolean> {
			return (await (await client()).exists(key)) > 0;
		},
	};
}

/**
 * Creates an Upstash Redis cache adapter from an existing client.
 *
 * Use this if you already have an @upstash/redis client instance.
 *
 * @param client - An existing Upstash Redis client
 * @returns A CacheAdapter backed by the provided client
 *
 * @example
 * ```typescript
 * import type { Redis } from '@upstash/redis';
 * import { createUpstashRedisAdapterFromClient } from '@c15t/backend/cache';
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN,
 * });
 *
 * const adapter = createUpstashRedisAdapterFromClient(redis);
 * ```
 *
 * @public
 */
export function createUpstashRedisAdapterFromClient(
	client: Redis
): CacheAdapter {
	return {
		async get<T>(key: string): Promise<T | null> {
			const result = await client.get<T>(key);
			return result ?? null;
		},

		async set<T>(key: string, value: T, ttlMs = GVL_TTL_MS): Promise<void> {
			// Convert milliseconds to seconds for Redis EX
			const ttlSeconds = Math.ceil(ttlMs / 1000);
			await client.set(key, value, { ex: ttlSeconds });
		},

		async delete(key: string): Promise<void> {
			await client.del(key);
		},

		async has(key: string): Promise<boolean> {
			const exists = await client.exists(key);
			return exists > 0;
		},
	};
}
