import type { Translations } from '@c15t/translations';
import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import {
	type JurisdictionCode,
	JurisdictionMessages,
} from '~/contracts/shared/jurisdiction.schema';
import type { C15TContext } from '~/types';
import { checkJurisdiction } from './geo';
import { getTranslations } from './translations';

function getHeaders(headers: Headers | undefined) {
	if (!headers) {
		throw new ORPCError('LOCATION_DETECTION_FAILED', {
			data: {
				reason: 'No headers found in request context',
			},
		});
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
	shouldShowBanner,
	jurisdiction,
	location,
	acceptLanguage,
	customTranslations,
}: {
	shouldShowBanner: boolean;

	jurisdiction: {
		code: JurisdictionCode;
		message: string;
	};
	location: { countryCode: string | null; regionCode: string | null };
	acceptLanguage: string | null;
	customTranslations: Record<string, Partial<Translations>> | undefined;
}) {
	return {
		showConsentBanner: shouldShowBanner,
		jurisdiction,
		location,
		translations: getTranslations(acceptLanguage, customTranslations),
	};
}

/**
 * Handler for the show consent banner endpoint
 * Determines if a user should see a consent banner based on their location
 */
export const showConsentBanner = os.consent.showBanner.handler(
	({ context }) => {
		const typedContext = context as C15TContext;

		const customTranslations = typedContext?.advanced?.customTranslations;
		const disableGeoLocation = typedContext?.advanced?.disableGeoLocation;

		const { countryCode, regionCode, acceptLanguage } = getHeaders(
			typedContext.headers
		);

		if (disableGeoLocation) {
			return buildResponse({
				shouldShowBanner: true,
				jurisdiction: {
					code: 'NONE',
					message: JurisdictionMessages.NONE,
				},
				location: { countryCode: null, regionCode: null },
				acceptLanguage,
				customTranslations,
			});
		}

		const { showConsentBanner, jurisdictionCode, message } =
			checkJurisdiction(countryCode);

		return buildResponse({
			shouldShowBanner: showConsentBanner,
			jurisdiction: {
				code: jurisdictionCode,
				message,
			},
			location: { countryCode, regionCode },
			acceptLanguage,
			customTranslations,
		});
	}
);
