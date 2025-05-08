/**
 * Checks the jurisdiction of the user based on their country code.
 *
 * @param countryCode - The country code of the user
 * @returns Object containing consent banner display status and jurisdiction information
 */
export function checkJurisdiction(countryCode: string | null) {
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

	let showConsentBanner = true;
	let jurisdictionCode = 'UNKNOWN';
	let message = 'No specific requirements';

	if (countryCode) {
		if (
			jurisdictions.EU.has(countryCode) ||
			jurisdictions.EEA.has(countryCode) ||
			jurisdictions.UK.has(countryCode)
		) {
			showConsentBanner = true;
			jurisdictionCode = 'GDPR';
			message = 'GDPR or equivalent regulations require a cookie banner.';
		} else if (jurisdictions.CH.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'CH';
			message = 'Switzerland requires similar data protection measures.';
		} else if (jurisdictions.BR.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'BR';
			message = "Brazil's LGPD requires consent for cookies.";
		} else if (jurisdictions.CA.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'PIPEDA';
			message = 'PIPEDA requires consent for data collection.';
		} else if (jurisdictions.AU.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'AU';
			message =
				"Australia's Privacy Act mandates transparency about data collection.";
		} else if (jurisdictions.JP.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'APPI';
			message = "Japan's APPI requires consent for data collection.";
		} else if (jurisdictions.KR.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'PIPA';
			message = "South Korea's PIPA requires consent for data collection.";
		}
	}

	return {
		showConsentBanner,
		jurisdictionCode,
		message,
	};
}
