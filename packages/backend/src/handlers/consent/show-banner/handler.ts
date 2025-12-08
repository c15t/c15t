import type { Translations } from '@c15t/translations';
import { os } from '~/contracts';
import type { JurisdictionCode } from '~/contracts/consent/show-banner.contract';
import type { Branding, C15TContext } from '~/types';
import { checkJurisdiction } from './geo';
import { getTranslations } from './translations';

function getHeaders(headers: Headers | undefined) {
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

function buildResponse({
	jurisdiction,
	location,
	acceptLanguage,
	customTranslations,
	branding = 'c15t',
}: {
	jurisdiction: JurisdictionCode;
	location: { countryCode: string | null; regionCode: string | null };
	acceptLanguage: string | null;
	customTranslations: Record<string, Partial<Translations>> | undefined;
	branding?: Branding;
}) {
	return {
		jurisdiction,
		location,
		translations: getTranslations(acceptLanguage, customTranslations),
		branding: branding,
	};
}

/**
 * Handler for the show consent banner endpoint
 * Determines if a user should see a consent banner based on their location
 */
export const showConsentBanner = os.consent.showBanner.handler(
	({ context }) => {
		const typedContext = context as C15TContext;
		const { customTranslations, disableGeoLocation, branding } =
			typedContext.advanced ?? {};
		const { countryCode, regionCode, acceptLanguage } = getHeaders(
			typedContext.headers
		);

		// We default to an Opt-In jurisdiction when geo location is disabled
		// As we don't know the jurisdiction in this case, it's better to show the strictest version of the banner
		if (disableGeoLocation) {
			return buildResponse({
				jurisdiction: 'GDPR',
				location: { countryCode: null, regionCode: null },
				acceptLanguage,
				customTranslations,
				branding,
			});
		}

		const jurisdiction = checkJurisdiction(countryCode, regionCode);

		return buildResponse({
			jurisdiction,
			location: { countryCode, regionCode },
			acceptLanguage,
			customTranslations,
			branding,
		});
	}
);
