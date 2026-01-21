/**
 * GVL (Global Vendor List) Fetcher
 *
 * Fetches the IAB TCF Global Vendor List from the consent.io endpoint.
 * Relies on HTTP Cache-Control headers for caching.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '../../types/iab-tcf';
import { GVL_ENDPOINT } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-flight request promises for deduplication, keyed by request parameters.
 * When multiple components request the GVL simultaneously with the same
 * parameters, they share the same promise to avoid duplicate network calls.
 */
const inflightRequests = new Map<string, Promise<GlobalVendorList | null>>();

/**
 * Cached GVL result for synchronous access after fetch completes.
 * This is a simple reference cache, not a TTL-based cache.
 *
 * - undefined: Not yet fetched
 * - null: Fetched and returned 204 (non-IAB region)
 * - GlobalVendorList: Fetched and returned GVL data
 */
let cachedGVL: GlobalVendorList | null | undefined = undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Main Fetcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the Global Vendor List from the GVL endpoint.
 *
 * Features:
 * - Accepts optional vendor IDs to filter the response (smaller payload)
 * - In-flight request deduplication (multiple callers share the same promise)
 * - Relies on HTTP Cache-Control headers for caching
 * - Returns null for 204 responses (non-IAB regions)
 *
 * @param vendorIds - Optional array of vendor IDs to include (filters response)
 * @param options - Fetch options
 * @returns The Global Vendor List, or null if 204 (non-IAB region)
 *
 * @example
 * ```typescript
 * // Fetch full GVL
 * const gvl = await fetchGVL();
 *
 * // Fetch filtered GVL with specific vendors
 * const filteredGvl = await fetchGVL([1, 2, 10, 755]);
 *
 * // Check for non-IAB region
 * if (gvl === null) {
 *   console.log('User is in a non-IAB region');
 * }
 * ```
 *
 * @public
 */
export async function fetchGVL(
	vendorIds?: number[],
	options: { endpoint?: string; headers?: HeadersInit } = {}
): Promise<GlobalVendorList | null> {
	const { endpoint = GVL_ENDPOINT, headers } = options;

	// Create a stable key for the request based on sorted vendorIds and headers
	const sortedVendorIds = vendorIds ? [...vendorIds].sort((a, b) => a - b) : [];
	const headersKey = headers ? JSON.stringify(headers) : '';
	const cacheKey = `${endpoint}|${sortedVendorIds.join(',')}|${headersKey}`;

	// Return in-flight request if one exists for these parameters (deduplication)
	const existingRequest = inflightRequests.get(cacheKey);
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
				headers,
			});

			// 204 means non-IAB region - no GVL needed
			if (response.status === 204) {
				cachedGVL = null;
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

			// Store for synchronous access
			cachedGVL = gvl;

			return gvl;
		} finally {
			// Clear in-flight request when done (success or error)
			inflightRequests.delete(cacheKey);
		}
	})();

	inflightRequests.set(cacheKey, promise);

	return promise;
}

/**
 * Gets the current GVL from memory without fetching.
 *
 * @returns The cached GVL, null if fetched 204, or undefined if not yet fetched
 *
 * @public
 */
export function getCachedGVL(): GlobalVendorList | null | undefined {
	return cachedGVL;
}

/**
 * Clears the in-flight requests and cached GVL.
 * Primarily used for testing.
 *
 * @public
 */
export function clearGVLCache(): void {
	inflightRequests.clear();
	cachedGVL = undefined;
}
