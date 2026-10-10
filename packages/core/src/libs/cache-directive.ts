/**
 * `Cache-Control` parsing, in a module of its own so the browser's vendor
 * list cache can read lifetimes without importing the server manifest
 * cache, which pulls in the request-header schema.
 */

/**
 * Reads a numeric directive such as `s-maxage` from a `Cache-Control`
 * header.
 *
 * @param cacheControl - The header value, if any.
 * @param directive - The directive name, lower-case.
 * @returns The directive in seconds, or `undefined` when absent or invalid.
 * @internal
 */
export const parseCacheDirectiveSeconds = function parseCacheDirectiveSeconds(
	cacheControl: string | null | undefined,
	directive: string
): number | undefined {
	if (!cacheControl) {
		return undefined;
	}
	for (const part of cacheControl.split(',')) {
		const [rawKey, rawValue] = part.trim().split('=');
		if (rawKey?.toLowerCase() !== directive) {
			continue;
		}
		const value = rawValue?.trim();
		if (!value || !/^\d+$/u.test(value)) {
			return undefined;
		}
		const seconds = Number(value);
		return Number.isSafeInteger(seconds) ? seconds : undefined;
	}
	return undefined;
};
