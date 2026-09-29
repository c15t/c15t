import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

const SVELTE_EXTRA_HEADERS = [
	'user-agent',
	'x-forwarded-for',
	'purpose',
	'sec-purpose',
] as const;

const FORWARDED_HEADERS = [
	...CONSENT_REQUEST_HEADER_NAMES,
	...SVELTE_EXTRA_HEADERS,
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
 * @param headersList - The Headers object from the incoming request
 * @param options - `trustForwardedHeaders` also copies `forwarded`,
 * `x-forwarded-host` and `x-forwarded-proto`, which any client can send.
 * Leave it off unless a proxy you control sets them and drops incoming ones.
 * @returns An object containing the relevant headers for consent management
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
