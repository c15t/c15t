/**
 * GVL (Global Vendor List) Fetcher
 *
 * Fetches the IAB TCF Global Vendor List from the inth.com endpoint.
 * Relies on HTTP Cache-Control headers for caching.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '@c15t/core';

import { GVL_ENDPOINT } from './constants';

/**
 * The most vendor ids ever put in the GVL request query string.
 *
 * The endpoint filters server-side, which is what keeps a scoped publisher from
 * downloading all 1,200-odd vendors, but the filter travels as a query string:
 * two hundred ids is already a 700-byte query, and a publisher that scopes a
 * few thousand pushes the request past the request-line limit a CDN enforces,
 * which fails the whole consent surface rather than just the filter. Above the
 * cap the endpoint returns the full list and callers narrow it locally, which
 * costs bytes instead of breaking.
 *
 * @internal
 */
const MAX_GVL_QUERY_VENDOR_IDS = 500;

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

/**
 * Mock GVL data for testing.
 * When set, fetchGVL will return this instead of making a network request.
 * @internal
 */
let mockGVLData: GlobalVendorList | null | undefined = undefined;

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
/**
 * Narrow a vendor list to a publisher allowlist.
 *
 * The GVL endpoint applies `vendorIds` server-side; a list that arrived by
 * another route (server-resolved state) is narrowed here so both paths
 * disclose the same vendors.
 *
 * @param gvl - The full vendor list.
 * @param vendorIds - Vendor IDs to keep. An empty list keeps every vendor.
 * @returns The same list with `vendors` limited to the allowlist.
 * @public
 */
export const narrowGVLToVendors = function narrowGVLToVendors(
	gvl: GlobalVendorList,
	vendorIds: readonly number[]
): GlobalVendorList {
	if (vendorIds.length === 0) {
		return gvl;
	}
	const allowed = new Set(vendorIds.map(String));
	const vendors: GlobalVendorList['vendors'] = {};
	for (const [id, vendor] of Object.entries(gvl.vendors)) {
		if (allowed.has(id)) {
			vendors[id] = vendor;
		}
	}
	return { ...gvl, vendors };
};

export const fetchGVL = function fetchGVL(
	vendorIds?: number[],
	options: { endpoint?: string; headers?: HeadersInit; format?: 'init' } = {}
): Promise<GlobalVendorList | null> {
	// Check for window-level mock GVL first (for testing in browser mode)
	const windowMockGVL =
		typeof window === 'undefined'
			? undefined
			: (window as unknown as { __c15t_mock_gvl?: GlobalVendorList | null })
					.__c15t_mock_gvl;

	if (windowMockGVL !== undefined) {
		cachedGVL = windowMockGVL;
		return Promise.resolve(windowMockGVL);
	}

	// If module-level mock GVL is set, return it immediately (for testing)
	if (mockGVLData !== undefined) {
		cachedGVL = mockGVLData;
		return Promise.resolve(mockGVLData);
	}

	const { endpoint = GVL_ENDPOINT, headers } = options;

	// Create a stable key for the request based on sorted vendorIds and headers
	const sortedVendorIds = vendorIds ? [...vendorIds].sort((a, b) => a - b) : [];
	const headersKey = headers ? JSON.stringify(headers) : '';
	const cacheKey = `${endpoint}|${sortedVendorIds.join(',')}|${headersKey}|${options.format ?? 'gvl'}`;

	// Return in-flight request if one exists for these parameters (deduplication)
	const existingRequest = inflightRequests.get(cacheKey);
	if (existingRequest) {
		return existingRequest;
	}

	// Build URL with vendor IDs filter
	const url = new URL(
		endpoint,
		typeof window === 'undefined' ? undefined : window.location.href
	);
	if (
		sortedVendorIds.length > 0 &&
		sortedVendorIds.length <= MAX_GVL_QUERY_VENDOR_IDS
	) {
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

			let payload: unknown = await response.json();
			if (options.format === 'init') {
				payload =
					payload && typeof payload === 'object' && 'gvl' in payload
						? payload.gvl
						: null;
			}
			const gvl = payload as GlobalVendorList;
			if (!gvl) {
				return null;
			}

			// Validate the response has required fields. tcfPolicyVersion belongs
			// in this list even though no caller reads it: the TC String derives its
			// TcfPolicyVersion from the vendor list rather than from config, so a
			// list carrying no usable version would encode a string that a reader
			// cannot grade against the policy it was collected under.
			if (
				!gvl.vendorListVersion ||
				!gvl.purposes ||
				!gvl.vendors ||
				!Number.isSafeInteger(gvl.tcfPolicyVersion) ||
				gvl.tcfPolicyVersion < 1
			) {
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
};

/**
 * Gets the current GVL from memory without fetching.
 *
 * @returns The cached GVL, null if fetched 204, or undefined if not yet fetched
 *
 * @public
 */
export const getCachedGVL = function getCachedGVL():
	| GlobalVendorList
	| null
	| undefined {
	return cachedGVL;
};

/**
 * Clears the in-flight requests and cached GVL.
 * Primarily used for testing.
 *
 * @public
 */
export const clearGVLCache = function clearGVLCache(): void {
	inflightRequests.clear();
	cachedGVL = undefined;
	mockGVLData = undefined;
};

/**
 * Sets mock GVL data for testing.
 * When set, fetchGVL will return this instead of making a network request.
 *
 * @param gvl - The mock GVL to return, null for 204 response, undefined to clear
 * @internal
 */
export const setMockGVL = function setMockGVL(
	gvl: GlobalVendorList | null | undefined
): void {
	mockGVLData = gvl;
	if (gvl !== undefined) {
		cachedGVL = gvl;
	}
};

/**
 * Gets the current mock GVL data.
 * @internal
 */
export const getMockGVL = function getMockGVL():
	| GlobalVendorList
	| null
	| undefined {
	return mockGVLData;
};
