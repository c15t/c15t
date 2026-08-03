/**
 * Pluggable caching.
 *
 * Ported from `@c15t/backend`'s `cache/` unchanged, because there was nothing
 * to change: the adapters are self-contained implementations of a four-method
 * interface, with no dependency on fumadb, the ORM adapters, or anything else
 * the rewrite replaced. `http/gvl.ts` here already declared the identical
 * `CacheAdapter` shape and accepted one — what was missing was any concrete
 * adapter to hand it.
 *
 * The one thing deliberately left behind is v2's `gvl-resolver.ts`. GVL
 * fetching and caching lives in `http/gvl.ts` in this package, and importing a
 * second resolver would mean two code paths deciding when a vendor list is
 * stale.
 *
 * ## Which adapter
 *
 * - **Memory** for a single long-lived process. Nothing to configure, and
 *   nothing shared between instances.
 * - **Upstash Redis** when more than one instance serves the same tenants, or
 *   on a serverless platform where memory does not survive between requests.
 * - **Cloudflare KV** on Workers.
 *
 * `@upstash/redis` is an optional peer dependency: only a deployment that uses
 * that adapter installs it.
 *
 * @example
 * ```ts
 * import { createUpstashRedisAdapter } from '@c15t/backend/cache';
 *
 * c15tInstance({
 * 	database: { dialect: 'postgres', url },
 * 	gvl: { cache: createUpstashRedisAdapter({ url, token }) },
 * });
 * ```
 */

export {
	clearMemoryCache,
	createCloudflareKVAdapter,
	createMemoryCacheAdapter,
	createUpstashRedisAdapter,
	createUpstashRedisAdapterFromClient,
	getMemoryCacheSize,
	type KVNamespace,
	type UpstashRedisAdapterOptions,
} from './adapters';
export { createCacheKey, createGVLCacheKey } from './keys';
export type { CacheAdapter } from './types';
export { GVL_TTL_MS, MEMORY_TTL_MS } from './types';
