import {
	CONSENT_REQUEST_HEADER_NAMES,
	extractConsentRequestInputs,
} from '@c15t/schema/types';

const SVELTE_EXTRA_HEADERS = [
	'user-agent',
	'x-forwarded-host',
	'x-forwarded-for',
	'purpose',
	'sec-purpose',
] as const;

const FORWARDED_HEADERS = [
	...CONSENT_REQUEST_HEADER_NAMES,
	...SVELTE_EXTRA_HEADERS,
] as const;

type ForwardedHeader = (typeof FORWARDED_HEADERS)[number];

type RelevantHeaders = Partial<Record<ForwardedHeader, string>>;

/**
 * Extracts relevant headers for consent management from the request headers.
 *
 * @param headersList - The Headers object from the incoming request
 * @returns An object containing the relevant headers for consent management
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
