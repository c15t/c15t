import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

const REACT_EXTRA_HEADERS = [
	'x-c15t-version',
	'user-agent',
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

/**
 * Forwarding headers a client can set to name a host or scheme. Passed to
 * the backend only when the app trusts them.
 */
export const CLIENT_FORWARDING_HEADERS = [
	'forwarded',
	'x-forwarded-host',
	'x-forwarded-proto',
] as const;

type ForwardedHeader =
	| (typeof FORWARDED_HEADERS)[number]
	| (typeof CLIENT_FORWARDING_HEADERS)[number];

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
 * - Standard headers (accept-language, user-agent, x-forwarded-for)
 * - Prefetch headers (purpose, sec-purpose, next-router-prefetch, x-middleware-prefetch)
 *
 * @param headersList - The Headers object from the incoming request
 * @param options - `trustForwardedHeaders` also copies `forwarded`,
 * `x-forwarded-host` and `x-forwarded-proto`, which any client can send.
 * Leave it off unless a proxy you control sets them and drops incoming ones.
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
	headersList: Headers,
	options: { trustForwardedHeaders?: boolean } = {}
): RelevantHeaders {
	const relevantHeaders: RelevantHeaders = {};
	const names: readonly ForwardedHeader[] = options.trustForwardedHeaders
		? [...FORWARDED_HEADERS, ...CLIENT_FORWARDING_HEADERS]
		: FORWARDED_HEADERS;

	for (const headerName of names) {
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
