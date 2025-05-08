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

	const jurisdictionRules = {
		GDPR: {
			countries: [
				...jurisdictions.EU,
				...jurisdictions.EEA,
				...jurisdictions.UK,
			],
			message: 'GDPR or equivalent regulations require a cookie banner.',
		},
		CH: {
			countries: [...jurisdictions.CH],
			message: 'Switzerland requires similar data protection measures.',
		},
		BR: {
			countries: [...jurisdictions.BR],
			message: "Brazil's LGPD requires consent for cookies.",
		},
		PIPEDA: {
			countries: [...jurisdictions.CA],
			message: 'PIPEDA requires consent for data collection.',
		},
		AU: {
			countries: [...jurisdictions.AU],
			message:
				"Australia's Privacy Act mandates transparency about data collection.",
		},
		APPI: {
			countries: [...jurisdictions.JP],
			message: "Japan's APPI requires consent for data collection.",
		},
		PIPA: {
			countries: [...jurisdictions.KR],
			message: "South Korea's PIPA requires consent for data collection.",
		},
	};

	if (!countryCode) {
		return {
			showConsentBanner: true,
			jurisdictionCode: 'UNKNOWN',
			message: 'No specific requirements',
		};
	}

	for (const [code, rule] of Object.entries(jurisdictionRules)) {
		if (rule.countries.includes(countryCode)) {
			return {
				showConsentBanner: true,
				jurisdictionCode: code,
				message: rule.message,
			};
		}
	}

	return {
		showConsentBanner: false,
		jurisdictionCode: 'NONE',
		message: 'No specific requirements',
	};
}
