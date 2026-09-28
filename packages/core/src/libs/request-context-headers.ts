import type { Overrides } from '../options/overrides';

/**
 * Request headers that carry the caller's init overrides to `GET /init`.
 *
 * In its own module so code that only builds the init request does not pull
 * in the rest of `request-context` (URL canonicalization, prefetch
 * matching, GPC detection).
 *
 * @param overrides - Country, region, language and GPC overrides.
 * @returns Header record to spread into the init request.
 */
export const buildRequestContextHeaders = function buildRequestContextHeaders(
	overrides?: Pick<Overrides, 'country' | 'region' | 'language' | 'gpc'>
): Record<string, string> {
	const headers: Record<string, string> = {};

	if (overrides?.gpc !== undefined) {
		// `Sec-*` request headers are forbidden to scripts, so the override
		// travels on the adapter header the shared extractor reads first.
		headers['x-c15t-gpc'] = overrides.gpc ? '1' : '0';
	}

	if (overrides?.country) {
		headers['x-c15t-country'] = overrides.country;
	}

	if (overrides?.region) {
		headers['x-c15t-region'] = overrides.region;
	}

	if (overrides?.language) {
		headers['accept-language'] = overrides.language;
	}

	return headers;
};
