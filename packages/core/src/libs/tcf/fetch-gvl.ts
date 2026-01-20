/**
 * GVL (Global Vendor List) Fetcher
 *
 * Fetches the IAB TCF Global Vendor List from the consent.io endpoint.
 * Includes caching to avoid repeated fetches.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '../../types/iab-tcf';
import { GVL_ENDPOINT, IAB_STORAGE_KEYS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CachedGVL {
	gvl: GlobalVendorList;
	timestamp: number;
	vendorIds: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Module State (Closures)
// ─────────────────────────────────────────────────────────────────────────────

/** In-memory cache for the current session */
let memoryCache: CachedGVL | null = null;

/** Cache TTL in milliseconds (24 hours) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Cache Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a cached GVL is valid for the requested vendor IDs.
 */
function isCacheValid(
	cache: CachedGVL | null,
	vendorIds: number[]
): cache is CachedGVL {
	if (!cache) {
		return false;
	}

	// Check if cache has expired
	const isExpired = Date.now() - cache.timestamp > CACHE_TTL_MS;
	if (isExpired) {
		return false;
	}

	// Check if all requested vendor IDs are in the cached response
	// If we requested fewer vendors, the cache is still valid
	const cachedVendorSet = new Set(cache.vendorIds);
	const allVendorsPresent = vendorIds.every((id) => cachedVendorSet.has(id));

	return allVendorsPresent;
}

/**
 * Loads GVL from localStorage cache.
 */
function loadFromStorage(): CachedGVL | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const stored = localStorage.getItem(IAB_STORAGE_KEYS.GVL_CACHE);
		if (!stored) {
			return null;
		}

		const parsed = JSON.parse(stored) as CachedGVL;
		return parsed;
	} catch {
		// Invalid cache, ignore
		return null;
	}
}

/**
 * Saves GVL to localStorage cache.
 */
function saveToStorage(cache: CachedGVL): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(IAB_STORAGE_KEYS.GVL_CACHE, JSON.stringify(cache));
	} catch {
		// Storage full or disabled, ignore
	}
}

/**
 * Clears the GVL cache (both memory and storage).
 */
export function clearGVLCache(): void {
	memoryCache = null;

	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem(IAB_STORAGE_KEYS.GVL_CACHE);
		} catch {
			// Ignore
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Fetcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the Global Vendor List from the GVL endpoint.
 *
 * Features:
 * - Accepts optional vendor IDs to filter the response (smaller payload)
 * - Uses in-memory and localStorage caching
 * - Validates cache before serving
 *
 * @param vendorIds - Optional array of vendor IDs to include (filters response)
 * @param options - Fetch options
 * @returns The Global Vendor List
 *
 * @example
 * ```typescript
 * // Fetch full GVL
 * const gvl = await fetchGVL();
 *
 * // Fetch filtered GVL with specific vendors
 * const filteredGvl = await fetchGVL([1, 2, 10, 755]);
 *
 * // Force fresh fetch (bypass cache)
 * const freshGvl = await fetchGVL([1, 2], { bypassCache: true });
 * ```
 *
 * @public
 */
export async function fetchGVL(
	vendorIds?: number[],
	options: { bypassCache?: boolean; endpoint?: string } = {}
): Promise<GlobalVendorList> {
	const { bypassCache = false, endpoint = GVL_ENDPOINT } = options;
	const requestedVendorIds = vendorIds ?? [];

	// Try memory cache first
	if (!bypassCache && isCacheValid(memoryCache, requestedVendorIds)) {
		return memoryCache.gvl;
	}

	// Try localStorage cache
	if (!bypassCache) {
		const storedCache = loadFromStorage();
		if (isCacheValid(storedCache, requestedVendorIds)) {
			// Populate memory cache from storage
			memoryCache = storedCache;
			return storedCache.gvl;
		}
	}

	// Build URL with vendor IDs filter
	const url = new URL(endpoint);
	if (requestedVendorIds.length > 0) {
		url.searchParams.set('vendorIds', requestedVendorIds.join(','));
	}

	// Fetch from network
	const response = await fetch(url.toString());

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

	// Cache the response
	const cache: CachedGVL = {
		gvl,
		timestamp: Date.now(),
		vendorIds:
			requestedVendorIds.length > 0
				? requestedVendorIds
				: Object.keys(gvl.vendors).map(Number),
	};

	memoryCache = cache;
	saveToStorage(cache);

	return gvl;
}

/**
 * Gets the current GVL from cache without fetching.
 *
 * @returns The cached GVL or null if not available
 *
 * @public
 */
export function getCachedGVL(): GlobalVendorList | null {
	if (memoryCache) {
		return memoryCache.gvl;
	}

	const storedCache = loadFromStorage();
	if (storedCache && Date.now() - storedCache.timestamp <= CACHE_TTL_MS) {
		memoryCache = storedCache;
		return storedCache.gvl;
	}

	return null;
}
