import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

const REACT_EXTRA_HEADERS = [
	'user-agent',
	'x-forwarded-host',
	'x-forwarded-for',
	'purpose',
	'sec-purpose',
	'next-router-prefetch',
	'x-middleware-prefetch',
] as const;

const FORWARDED_HEADERS = [
	...CONSENT_REQUEST_HEADER_NAMES,
	...REACT_EXTRA_HEADERS,
] as const;

type ForwardedHeader = (typeof FORWARDED_HEADERS)[number];

type RelevantHeaders = Partial<Record<ForwardedHeader, string>>;

/**
 * Extracts relevant headers for consent management from the request headers.
 *
 * @remarks
 * This function extracts geo-location headers (country, region) from various
 * CDN providers (Cloudflare, Vercel, AWS CloudFront) and normalizes them
 * into a consistent format for the c15t backend.
 *
 * The extracted headers include:
 * - Country headers (cf-ipcountry, x-vercel-ip-country, etc.)
 * - Region headers (x-vercel-ip-country-region, x-region-code)
 * - Standard headers (accept-language, user-agent, x-forwarded-*)
 * - Prefetch headers (purpose, sec-purpose, next-router-prefetch, x-middleware-prefetch)
 *
 * @param headersList - The Headers object from the incoming request
 * @returns An object containing the relevant headers for consent management
 *
 * @example
 * ```ts
 * import { extractRelevantHeaders } from '@c15t/react/server';
 *
 * // In your framework's request handler
 * const relevantHeaders = extractRelevantHeaders(request.headers);
 * ```
 *
 * @public
 */
export const extractRelevantHeaders = function extractRelevantHeaders(
	headersList: Headers
): RelevantHeaders {
	const relevantHeaders: RelevantHeaders = {};

	for (const headerName of FORWARDED_HEADERS) {
		const value = headersList.get(headerName);
		if (value) {
			relevantHeaders[headerName] = value;
		}
	}

	const inputs = extractConsentRequestInputs(headersList);
	if (inputs.country) {
		relevantHeaders['x-c15t-country'] = inputs.country;
	}
	if (inputs.region) {
		relevantHeaders['x-c15t-region'] = inputs.region;
	}

	return relevantHeaders;
};
