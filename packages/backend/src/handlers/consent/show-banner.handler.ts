import { os } from '~/contracts';
import {
	type JurisdictionCode,
	JurisdictionMessages,
} from '~/contracts/shared/jurisdiction.schema';
import type { C15TContext } from '~/types';

/**
 * Handler for the show consent banner endpoint
 * Determines if a user should see a consent banner based on their location
 */
export const showConsentBanner = os.consent.showBanner.handler(
	({ context }) => {
		const typedContext = context as C15TContext;

		// Extract country and region from request headers
		const headers = typedContext.headers;

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
			normalizeHeader(headers?.get('cf-ipcountry')) ??
			normalizeHeader(headers?.get('x-vercel-ip-country')) ??
			normalizeHeader(headers?.get('x-amz-cf-ipcountry')) ??
			normalizeHeader(headers?.get('x-country-code'));

		const regionCode =
			normalizeHeader(headers?.get('x-vercel-ip-country-region')) ??
			normalizeHeader(headers?.get('x-region-code'));

		console.log('countryCode', countryCode);
		// Determine jurisdiction based on country
		const { showConsentBanner, jurisdictionCode, message } = checkJurisdiction(
			countryCode ?? null
		);

		// Return properly structured response
		return {
			showConsentBanner,
			jurisdiction: {
				code: jurisdictionCode,
				message,
			},
			location: { countryCode, regionCode },
		};
	}
);

/**
 * Determines if a consent banner should be shown based on country code
 * and returns appropriate jurisdiction information
 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
function checkJurisdiction(countryCode: string | null) {
	// Country code sets for different jurisdictions
	const jurisdictions = {
		EU: new Set([
			'AT',
			'BE',
			'BG',
			'HR',
			'CY',
			'CZ',
			'DK',
			'EE',
			'FI',
			'FR',
			'DE',
			'GR',
			'HU',
			'IE',
			'IT',
			'LV',
			'LT',
			'LU',
			'MT',
			'NL',
			'PL',
			'PT',
			'RO',
			'SK',
			'SI',
			'ES',
			'SE',
		]),
		EEA: new Set(['IS', 'NO', 'LI']),
		UK: new Set(['GB']),
		CH: new Set(['CH']),
		BR: new Set(['BR']),
		CA: new Set(['CA']),
		AU: new Set(['AU']),
		JP: new Set(['JP']),
		KR: new Set(['KR']),
	};

	// Default to no jurisdiction
	let showConsentBanner = false;
	let jurisdictionCode: JurisdictionCode = 'NONE';

	// Check country code against jurisdiction sets
	if (countryCode) {
		if (
			jurisdictions.EU.has(countryCode) ||
			jurisdictions.EEA.has(countryCode) ||
			jurisdictions.UK.has(countryCode)
		) {
			showConsentBanner = true;
			jurisdictionCode = 'GDPR';
		} else if (jurisdictions.CH.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'CH';
		} else if (jurisdictions.BR.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'BR';
		} else if (jurisdictions.CA.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'PIPEDA';
		} else if (jurisdictions.AU.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'AU';
		} else if (jurisdictions.JP.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'APPI';
		} else if (jurisdictions.KR.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'PIPA';
		}
	}

	// Get corresponding message from shared schema
	const message = JurisdictionMessages[jurisdictionCode];

	return {
		showConsentBanner,
		jurisdictionCode,
		message,
	};
}
