import { defineValidatedRoute } from '../../utils/define-validated-route';

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

function checkJurisdiction(countryCode: string | null) {
	let showConsentBanner = false;
	let jurisdictionCode = 'NONE';
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
		}
		// ... other jurisdiction checks remain the same
	}

	return { showConsentBanner, jurisdictionCode, message };
}

export default defineValidatedRoute({
	handler: async (event) => {
		const headers = event.node.req.headers;
		const countryCode =
			headers['cf-ipcountry'] ||
			headers['x-vercel-ip-country'] ||
			headers['x-amz-cf-ipcountry'] ||
			headers['x-country-code'] ||
			null;

		const regionCode =
			headers['x-vercel-ip-country-region'] || headers['x-region-code'] || null;

		const { showConsentBanner, jurisdictionCode, message } = checkJurisdiction(
			countryCode as string | null
		);

		return {
			showConsentBanner,
			jurisdiction: {
				code: jurisdictionCode,
				message,
			},
			location: {
				countryCode: countryCode || 'UNKNOWN',
				regionCode: regionCode || 'UNKNOWN',
			},
		};
	},
});
