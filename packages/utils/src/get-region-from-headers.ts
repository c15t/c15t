const COUNTRY_HEADERS = [
	'x-c15t-country',
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
] as const;

const REGION_HEADERS = [
	'x-c15t-region',
	'x-vercel-ip-country-region',
	'x-region-code',
] as const;

export function headersToRecord(headers: Headers): Record<string, string> {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		record[key.toLowerCase()] = value;
	});
	return record;
}

function pickHeader(
	headers: Record<string, string>,
	names: readonly string[]
): string | undefined {
	return names.reduce<string | undefined>(
		(value, name) => value ?? headers[name.toLowerCase()] ?? headers[name],
		undefined
	);
}

/**
 * Resolves country and region from common geo IP headers.
 */
export function getRegionFromHeaders(headers: Record<string, string>): {
	region?: string;
	country?: string;
} {
	const country = pickHeader(headers, COUNTRY_HEADERS);
	const region = pickHeader(headers, REGION_HEADERS);

	return {
		...(country && { country }),
		...(region && { region }),
	};
}
