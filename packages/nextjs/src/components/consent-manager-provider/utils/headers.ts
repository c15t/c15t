type LocationHeader =
	| (typeof LOCATION_HEADERS)[number]
	| 'x-c15t-country'
	| 'x-c15t-region';

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

const LOCATION_HEADERS = [
	...COUNTRY_PRIORITY,
	...REGION_PRIORITY,
	'accept-language',
	'user-agent',
] as const;

export function extractRelevantHeaders(
	headersList: Headers
): Record<LocationHeader, string> {
	const relevantHeaders: Record<LocationHeader, string> = {} as Record<
		LocationHeader,
		string
	>;

	// Extract all relevant headers
	for (const headerName of LOCATION_HEADERS) {
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
