/**
 * Cache Adapters
 *
 * Pluggable cache adapter implementations for different storage backends.
 *
 * @packageDocumentation
 */

export {
	createCloudflareKVAdapter,
	type KVNamespace,
} from './cloudflare-kv';
export {
	clearMemoryCache,
	createMemoryCacheAdapter,
	getMemoryCacheSize,
} from './memory';
export {
	createUpstashRedisAdapter,
	createUpstashRedisAdapterFromClient,
	type UpstashRedisAdapterOptions,
} from './upstash-redis';
