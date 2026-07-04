import type { ResolveInitFromManifestInputs } from '@c15t/schema/types';

const COUNTRY_HEADERS = [
	'x-c15t-country',
	'x-vercel-ip-country',
	'cf-ipcountry',
	'x-amz-cf-ipcountry',
	'x-country-code',
	'x-country',
] as const;

const REGION_HEADERS = [
	'x-c15t-region',
	'x-vercel-ip-country-region',
	'cf-region-code',
	'x-region-code',
] as const;

export interface ConsentRequestInputs extends ResolveInitFromManifestInputs {
	country?: string;
	region?: string;
	language?: string;
}

function pickHeader(headers: Headers, names: readonly string[]) {
	for (const name of names) {
		const value = headers.get(name);
		if (value) return value;
	}
	return undefined;
}

/**
 * Extract the first entry from an Accept-Language header, stripping any
 * quality suffix. Returns undefined if the header is absent or unparseable.
 */
export function parseAcceptLanguage(header: string | null): string | undefined {
	if (!header) return undefined;
	const first = header.split(',')[0]?.trim();
	if (!first) return undefined;
	const code = first.split(';')[0]?.trim();
	return code && code.length <= 10 ? code : undefined;
}

export function parseGlobalPrivacyControl(
	header: string | null
): boolean | undefined {
	if (header === '1') return true;
	if (header === '0') return false;
	return undefined;
}

export function extractConsentRequestInputs(
	headers: Headers,
	overrides: Partial<ConsentRequestInputs> = {}
): ConsentRequestInputs {
	return {
		country: overrides.country ?? pickHeader(headers, COUNTRY_HEADERS),
		region: overrides.region ?? pickHeader(headers, REGION_HEADERS),
		language:
			overrides.language ?? parseAcceptLanguage(headers.get('accept-language')),
		gpc: overrides.gpc ?? parseGlobalPrivacyControl(headers.get('sec-gpc')),
	};
}

export function consentInputsToOverrides(
	inputs: ConsentRequestInputs
): Record<string, string | boolean> {
	const overrides: Record<string, string | boolean> = {};
	if (inputs.country) overrides.country = inputs.country;
	if (inputs.region) overrides.region = inputs.region;
	if (inputs.language) overrides.language = inputs.language;
	if (inputs.gpc !== undefined) overrides.gpc = inputs.gpc;
	return overrides;
}
