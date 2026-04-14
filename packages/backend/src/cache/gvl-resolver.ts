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
import { withCacheSpan, withExternalSpan } from '~/utils/instrumentation';
import { getMetrics } from '~/utils/metrics';
import { createMemoryCacheAdapter } from './adapters/memory';
import { createGVLCacheKey } from './keys';
import type { CacheAdapter } from './types';
import { GVL_TTL_MS, MEMORY_TTL_MS } from './types';

/**
 * Default GVL endpoint.
 */
const GVL_ENDPOINT = 'https://gvl.consent.io';

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
		const fetchStart = Date.now();
		try {
			const gvl = await withExternalSpan(
				{ url: url.toString(), method: 'GET' },
				async () => {
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

					// Use text() then JSON.parse to handle malformed responses (e.g. trailing
					// content or BOM) that would break response.json()
					const text = await response.text();
					const trimmed = text.trim().replace(/^\uFEFF/, ''); // Strip BOM
					let parsed: GlobalVendorList;
					try {
						parsed = JSON.parse(trimmed) as GlobalVendorList;
					} catch {
						// If response has valid JSON followed by extra content, try parsing
						// only the first complete JSON value (find matching braces)
						let depth = 0;
						let end = -1;
						const start = trimmed.indexOf('{');
						if (start >= 0) {
							for (let i = start; i < trimmed.length; i++) {
								const c = trimmed[i];
								if (c === '{') depth++;
								else if (c === '}') {
									depth--;
									if (depth === 0) {
										end = i + 1;
										break;
									}
								}
							}
						}
						if (end > 0) {
							parsed = JSON.parse(trimmed.slice(0, end)) as GlobalVendorList;
						} else {
							throw new SyntaxError('Invalid GVL response: not valid JSON');
						}
					}

					// Validate the response has required fields
					if (
						!parsed.vendorListVersion ||
						!parsed.purposes ||
						!parsed.vendors
					) {
						throw new Error('Invalid GVL response: missing required fields');
					}

					return parsed;
				}
			);

			getMetrics()?.recordGvlFetch(
				{ language, source: 'fetch', status: 200 },
				Date.now() - fetchStart
			);

			return gvl;
		} catch (error) {
			getMetrics()?.recordGvlError({
				language,
				errorType: error instanceof Error ? error.name : 'UnknownError',
			});
			throw error;
		} finally {
			// Clear in-flight request when done
			inflightRequests.delete(dedupeKey);
		}
	})();

	inflightRequests.set(dedupeKey, promise);

	return promise;
}

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
			const memoryHit = await withCacheSpan('get', 'memory', () =>
				memoryCache.get<GlobalVendorList>(cacheKey)
			);
			if (memoryHit) {
				getMetrics()?.recordCacheHit('memory');
				return memoryHit;
			}
			getMetrics()?.recordCacheMiss('memory');

			// 3. Check external cache if configured (20-40ms)
			if (cacheAdapter) {
				const externalHit = await withCacheSpan('get', 'external', () =>
					cacheAdapter.get<GlobalVendorList>(cacheKey)
				);
				if (externalHit) {
					getMetrics()?.recordCacheHit('external');
					// Populate memory cache for next request
					await withCacheSpan('set', 'memory', () =>
						memoryCache.set(cacheKey, externalHit, MEMORY_TTL_MS)
					);
					return externalHit;
				}
				getMetrics()?.recordCacheMiss('external');
			}

			// 4. Fetch from gvl.consent.io with Accept-Language header (100-300ms)
			const gvl = await fetchGVLWithLanguage(language, vendorIds, endpoint);

			if (gvl) {
				// Populate both caches
				await withCacheSpan('set', 'memory', () =>
					memoryCache.set(cacheKey, gvl, MEMORY_TTL_MS)
				);
				if (cacheAdapter) {
					await withCacheSpan('set', 'external', () =>
						cacheAdapter.set(cacheKey, gvl, GVL_TTL_MS)
					);
				}
			}

			return gvl;
		},
	};
}
