/**
 * Cache Module
 *
 * Multi-layer caching system with pluggable adapters for GVL and other data.
 *
 * @packageDocumentation
 */

// Adapters
export {
	clearMemoryCache,
	// Cloudflare KV
	createCloudflareKVAdapter,
	// Memory
	createMemoryCacheAdapter,
	// Upstash Redis
	createUpstashRedisAdapter,
	createUpstashRedisAdapterFromClient,
	getMemoryCacheSize,
	type KVNamespace,
	type UpstashRedisAdapterOptions,
} from './adapters';
// GVL Resolver
export {
	createGVLResolver,
	type GVLResolver,
	type GVLResolverOptions,
} from './gvl-resolver';

// Cache Key Utilities
export { createCacheKey, createGVLCacheKey } from './keys';
// Types
export type { CacheAdapter } from './types';
export { GVL_TTL_MS, MEMORY_TTL_MS } from './types';
