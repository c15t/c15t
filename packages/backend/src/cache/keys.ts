/**
 * Cache Key Utilities
 *
 * Functions for generating consistent cache keys with app name prefixing.
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// GVL Cache Keys
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a GVL cache key.
 *
 * Format: `{appName}:gvl:{language}:{sortedVendorIds}`
 *
 * @param appName - The application name for key prefixing
 * @param language - The language code (e.g., "en", "de")
 * @param vendorIds - Optional array of vendor IDs to include in the key
 * @returns A unique cache key for the GVL configuration
 *
 * @example
 * ```typescript
 * // All vendors
 * createGVLCacheKey('my-app', 'en');
 * // => 'my-app:gvl:en:all'
 *
 * // Specific vendors
 * createGVLCacheKey('my-app', 'de', [1, 10, 2]);
 * // => 'my-app:gvl:de:1,2,10'
 * ```
 *
 * @public
 */
export function createGVLCacheKey(
	appName: string,
	language: string,
	vendorIds?: number[]
): string {
	const sortedIds = vendorIds
		? [...vendorIds].sort((a, b) => a - b).join(',')
		: 'all';
	return `${appName}:gvl:${language}:${sortedIds}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Cache Keys
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a generic cache key with namespace and parts.
 *
 * Format: `{appName}:{namespace}:{part1}:{part2}:...`
 *
 * @param appName - The application name for key prefixing
 * @param namespace - The cache namespace (e.g., "gvl", "translations")
 * @param parts - Additional key parts
 * @returns A namespaced cache key
 *
 * @example
 * ```typescript
 * createCacheKey('my-app', 'translations', 'en', 'banner');
 * // => 'my-app:translations:en:banner'
 * ```
 *
 * @public
 */
export function createCacheKey(
	appName: string,
	namespace: string,
	...parts: (string | number)[]
): string {
	const allParts = [appName, namespace, ...parts];
	return allParts.join(':');
}
