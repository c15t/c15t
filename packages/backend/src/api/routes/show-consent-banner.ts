import { createAuthEndpoint } from '~/pkgs/api-router/call';

export const showConsentBanner = createAuthEndpoint(
	'/show-consent-banner',
	{
		method: 'GET',
		metadata: {
			openapi: {
				responses: {
					'200': {
						description: 'Cookie Banner Requirement',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										showConsentBanner: { type: 'boolean' },
										jurisdiction: {
											type: 'object',
											properties: {
												code: { type: 'string' },
												message: { type: 'string' },
											},
										},
										location: {
											type: 'object',
											properties: {
												countryCode: { type: 'string' },
												regionCode: { type: 'string' },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
	async (c) => {
		const countryCode =
			c.headers?.get('cf-ipcountry') ||
			c.headers?.get('x-vercel-ip-country') ||
			c.headers?.get('x-amz-cf-ipcountry') ||
			c.headers?.get('x-country-code');

		const regionCode =
			c.headers?.get('x-vercel-ip-country-region') ||
			c.headers?.get('x-region-code');
		const { showConsentBanner, jurisdictionCode, message } = checkJurisdiction(
			countryCode ?? null
		);

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

function checkJurisdiction(countryCode: string | null) {
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

	return { showConsentBanner, jurisdictionCode, message };
}
