import type { GlobalVendorList, NonIABVendor } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import type { Branding } from '~/types';
import type { JurisdictionCode } from '~/types/api';
import { getTranslationsData } from './translations';

/**
 * Gets the headers from the context.
 *
 * @param headers - The headers to get the headers from.
 * @returns The headers or null if the headers are not present.
 */
export function getHeaders(headers: Headers | undefined) {
	if (!headers) {
		return {
			countryCode: null,
			regionCode: null,
			acceptLanguage: null,
		};
	}

	// Add this conversion to ensure headers are always string or null
	const normalizeHeader = (
		value: string | string[] | null | undefined
	): string | null => {
		if (!value) {
			return null;
		}

		return Array.isArray(value) ? (value[0] ?? null) : value;
	};

	const countryCode =
		normalizeHeader(headers.get('x-c15t-country')) ??
		normalizeHeader(headers.get('cf-ipcountry')) ??
		normalizeHeader(headers.get('x-vercel-ip-country')) ??
		normalizeHeader(headers.get('x-amz-cf-ipcountry')) ??
		normalizeHeader(headers.get('x-country-code'));

	const regionCode =
		normalizeHeader(headers.get('x-c15t-region')) ??
		normalizeHeader(headers.get('x-vercel-ip-country-region')) ??
		normalizeHeader(headers.get('x-region-code'));

	// Get preferred language from Accept-Language header
	const acceptLanguage = normalizeHeader(headers.get('accept-language'));

	return {
		countryCode,
		regionCode,
		acceptLanguage,
	};
}

/**
 * Parse Accept-Language header to get the primary language code.
 *
 * @param acceptLanguage - The Accept-Language header value
 * @returns The primary language code (e.g., "en", "de"), defaults to "en"
 */
export function parseAcceptLanguage(acceptLanguage: string | null): string {
	if (!acceptLanguage) {
		return 'en';
	}

	// Parse "en-US,en;q=0.9,de;q=0.8" format
	// Split by comma, take the first part, then extract language code
	const firstLanguage = acceptLanguage.split(',')[0];
	if (!firstLanguage) {
		return 'en';
	}

	// Remove quality factor if present (e.g., "en;q=0.9" -> "en")
	const languageWithRegion = firstLanguage.split(';')[0]?.trim();
	if (!languageWithRegion) {
		return 'en';
	}

	// Extract language code without region (e.g., "en-US" -> "en")
	const languageCode = languageWithRegion.split('-')[0]?.toLowerCase();

	return languageCode ?? 'en';
}

export function buildResponse({
	jurisdiction,
	location,
	acceptLanguage,
	customTranslations,
	branding = 'c15t',
	gvl,
	customVendors,
}: {
	jurisdiction: JurisdictionCode;
	location: { countryCode: string | null; regionCode: string | null };
	acceptLanguage: string | null;
	customTranslations: Record<string, Partial<Translations>> | undefined;
	branding?: Branding;
	gvl?: GlobalVendorList;
	customVendors?: NonIABVendor[];
}) {
	return {
		jurisdiction,
		location,
		translations: getTranslationsData(acceptLanguage, customTranslations),
		branding: branding,
		gvl: gvl ?? null,
		customVendors: customVendors ?? undefined,
	};
}

export { checkJurisdiction, getJurisdiction, getLocation } from './geo';
// Re-export translations functions
export { getTranslations, getTranslationsData } from './translations';
