const COUNTRY_PRIORITY = [
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
] as const;

const REGION_PRIORITY = [
	'x-vercel-ip-country-region',
	'x-region-code',
] as const;

const FORWARDED_HEADERS = [
	...COUNTRY_PRIORITY,
	...REGION_PRIORITY,
	'accept-language',
	'user-agent',
	'x-forwarded-host',
	'x-forwarded-for',
] as const;

type ForwardedHeader =
	| (typeof FORWARDED_HEADERS)[number]
	| 'x-c15t-country'
	| 'x-c15t-region';

type RelevantHeaders = Partial<Record<ForwardedHeader, string>>;

export function extractRelevantHeaders(headersList: Headers): RelevantHeaders {
	const relevantHeaders: RelevantHeaders = {};

	// Extract all relevant headers
	for (const headerName of FORWARDED_HEADERS) {
		const value = headersList.get(headerName);
		if (value) {
			relevantHeaders[headerName] = value;
		}
	}

	// Set country based on priority
	const countryHeader = COUNTRY_PRIORITY.find(
		(header) => relevantHeaders[header]
	);
	if (countryHeader) {
		relevantHeaders['x-c15t-country'] = relevantHeaders[countryHeader];
	}

	// Set region based on priority
	const regionHeader = REGION_PRIORITY.find(
		(header) => relevantHeaders[header]
	);
	if (regionHeader) {
		relevantHeaders['x-c15t-region'] = relevantHeaders[regionHeader];
	}

	return relevantHeaders;
}
