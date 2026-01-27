/**
 * GVL Resolution Service
 *
 * Resolves Global Vendor List with multi-layer caching:
 * 1. Bundled translations (checked first)
 * 2. In-memory cache
 * 3. External cache (Redis/KV)
 * 4. Fetch from gvl.consent.io
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '@c15t/schema/types';
import { createMemoryCacheAdapter } from './adapters/memory';
import { createGVLCacheKey } from './keys';
import type { CacheAdapter } from './types';
import { GVL_TTL_MS, MEMORY_TTL_MS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default GVL endpoint.
 */
const GVL_ENDPOINT = 'https://gvl.consent.io';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for creating a GVL resolver.
 *
 * @public
 */
export interface GVLResolverOptions {
	/**
	 * The application name for cache key prefixing.
	 */
	appName: string;

	/**
	 * Bundled GVL translations by language code.
	 * These are checked first before any cache.
	 */
	bundled?: Record<string, GlobalVendorList>;

	/**
	 * External cache adapter (Redis, KV, etc.).
	 * If not provided, only in-memory cache is used.
	 */
	cacheAdapter?: CacheAdapter;

	/**
	 * Vendor IDs to filter when fetching from the GVL endpoint.
	 * Reduces payload size.
	 */
	vendorIds?: number[];

	/**
	 * Override the default GVL endpoint.
	 * @default 'https://gvl.consent.io'
	 */
	endpoint?: string;
}

/**
 * GVL resolver interface.
 *
 * @public
 */
export interface GVLResolver {
	/**
	 * Get a localized GVL for the specified language.
	 *
	 * @param language - Language code (e.g., "en", "de")
	 * @returns The GVL for the language, or null if unavailable
	 */
	get(language: string): Promise<GlobalVendorList | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GVL Fetcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-flight request promises for deduplication.
 */
const inflightRequests = new Map<string, Promise<GlobalVendorList | null>>();

/**
 * Fetches GVL from the endpoint with the specified language.
 *
 * @param language - Language code for Accept-Language header
 * @param vendorIds - Optional vendor IDs to filter
 * @param endpoint - GVL endpoint URL
 * @returns The GVL or null if 204 (non-IAB region)
 */
async function fetchGVLWithLanguage(
	language: string,
	vendorIds?: number[],
	endpoint: string = GVL_ENDPOINT
): Promise<GlobalVendorList | null> {
	// Create a stable key for deduplication
	const sortedVendorIds = vendorIds ? [...vendorIds].sort((a, b) => a - b) : [];
	const dedupeKey = `${endpoint}|${language}|${sortedVendorIds.join(',')}`;

	// Return in-flight request if one exists
	const existingRequest = inflightRequests.get(dedupeKey);
	if (existingRequest) {
		return existingRequest;
	}

	// Build URL with vendor IDs filter
	const url = new URL(endpoint);
	if (sortedVendorIds.length > 0) {
		url.searchParams.set('vendorIds', sortedVendorIds.join(','));
	}

	// Create and store the in-flight promise
	const promise = (async () => {
		try {
			const response = await fetch(url.toString(), {
				headers: {
					'Accept-Language': language,
				},
			});

			// 204 means non-IAB region - no GVL needed
			if (response.status === 204) {
				return null;
			}

			if (!response.ok) {
				throw new Error(
					`Failed to fetch GVL: ${response.status} ${response.statusText}`
				);
			}

			const gvl = (await response.json()) as GlobalVendorList;

			// Validate the response has required fields
			if (!gvl.vendorListVersion || !gvl.purposes || !gvl.vendors) {
				throw new Error('Invalid GVL response: missing required fields');
			}

			return gvl;
		} finally {
			// Clear in-flight request when done
			inflightRequests.delete(dedupeKey);
		}
	})();

	inflightRequests.set(dedupeKey, promise);

	return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// GVL Resolver Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a GVL resolver with multi-layer caching.
 *
 * Resolution order:
 * 1. **Bundled** - Check bundled translations (0ms)
 * 2. **In-Memory** - Check worker/process memory cache (0ms)
 * 3. **External Cache** - Check Redis/KV if configured (20-40ms)
 * 4. **Fetch** - Fetch from gvl.consent.io with Accept-Language (100-300ms)
 *
 * @param options - Resolver configuration
 * @returns A GVL resolver instance
 *
 * @example
 * ```typescript
 * const resolver = createGVLResolver({
 *   appName: 'my-app',
 *   bundled: { en: enGVL },
 *   cacheAdapter: redisAdapter,
 *   vendorIds: [1, 2, 10],
 * });
 *
 * const gvl = await resolver.get('de');
 * ```
 *
 * @public
 */
export function createGVLResolver(options: GVLResolverOptions): GVLResolver {
	const { appName, bundled, cacheAdapter, vendorIds, endpoint } = options;

	// Create the in-memory cache adapter (always used as first layer)
	const memoryCache = createMemoryCacheAdapter();

	return {
		async get(language: string): Promise<GlobalVendorList | null> {
			const cacheKey = createGVLCacheKey(appName, language, vendorIds);

			// 1. Check bundled languages first (0ms)
			if (bundled?.[language]) {
				return bundled[language];
			}

			// 2. Check in-memory cache (0ms)
			const memoryHit = await memoryCache.get<GlobalVendorList>(cacheKey);
			if (memoryHit) {
				return memoryHit;
			}

			// 3. Check external cache if configured (20-40ms)
			if (cacheAdapter) {
				const externalHit = await cacheAdapter.get<GlobalVendorList>(cacheKey);
				if (externalHit) {
					// Populate memory cache for next request
					await memoryCache.set(cacheKey, externalHit, MEMORY_TTL_MS);
					return externalHit;
				}
			}

			// 4. Fetch from gvl.consent.io with Accept-Language header (100-300ms)
			const gvl = await fetchGVLWithLanguage(language, vendorIds, endpoint);

			if (gvl) {
				// Populate both caches
				await memoryCache.set(cacheKey, gvl, MEMORY_TTL_MS);
				if (cacheAdapter) {
					await cacheAdapter.set(cacheKey, gvl, GVL_TTL_MS);
				}
			}

			return gvl;
		},
	};
}
