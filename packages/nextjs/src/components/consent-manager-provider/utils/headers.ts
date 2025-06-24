const LOCATION_HEADERS = [
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
	'x-vercel-ip-country-region',
	'x-region-code',
	'accept-language',
	'user-agent',
] as const;

export function extractRelevantHeaders(
	headersList: Headers
): Record<string, string> {
	const relevantHeaders: Record<string, string> = {};

	for (const headerName of LOCATION_HEADERS) {
		const value = headersList.get(headerName);
		if (value) {
			relevantHeaders[headerName] = value;
		}
	}

	return relevantHeaders;
}
