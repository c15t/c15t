import { checkJurisdiction } from './jurisdiction';

/**
 * Interface for generic headers object
 */
interface Headers {
	get(name: string): string | null;
}

/**
 * Response interface for the consent banner data
 */
interface ConsentBannerResponse {
	showConsentBanner: boolean;
	jurisdiction: {
		code: string;
		message: string;
	};
	location: {
		countryCode: string | null;
		regionCode: string | null;
	};
}

/**
 * Determines whether to show a consent banner based on the request headers
 * and user's jurisdiction.
 *
 * @param props - Object containing headers for location detection
 * @returns Object containing consent banner display status and location information
 */
export function showConsentBanner(headers: Headers): ConsentBannerResponse {
	const countryCode =
		headers.get('cf-ipcountry') ||
		headers.get('x-vercel-ip-country') ||
		headers.get('x-amz-cf-ipcountry') ||
		headers.get('x-country-code');

	const regionCode =
		headers.get('x-vercel-ip-country-region') || headers.get('x-region-code');

	const language = headers.get('accept-language')?.split(',')[0];

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
