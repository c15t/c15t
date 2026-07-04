import type { Overrides } from 'c15t';
import { extractRelevantHeaders } from './headers';

/**
 * Creates a stable cache key for SSR init responses.
 *
 * @remarks
 * This is framework-agnostic and can be used by wrappers (e.g. Next.js)
 * to align cache key construction with the headers/override semantics used
 * for SSR init fetching.
 *
 * @param normalizedURL - Normalized backend URL for /init
 * @param headers - Request headers
 * @param overrides - Optional location/language overrides
 * @returns A stable JSON string key
 *
 * @public
 */
export function createSSRInitCacheKey({
	normalizedURL,
	headers,
	overrides,
}: {
	normalizedURL: string;
	headers: Headers;
	overrides?: Overrides;
}): string {
	const relevantHeaders = extractRelevantHeaders(headers);

	const effectiveCountry =
		overrides?.country ?? relevantHeaders['x-c15t-country'] ?? '';
	const effectiveRegion =
		overrides?.region ?? relevantHeaders['x-c15t-region'] ?? '';
	const effectiveLanguage =
		overrides?.language ?? relevantHeaders['accept-language'] ?? '';
	const gpc = relevantHeaders['sec-gpc'] ?? '';

	return JSON.stringify({
		normalizedURL,
		country: effectiveCountry,
		region: effectiveRegion,
		language: effectiveLanguage,
		gpc,
	});
}
