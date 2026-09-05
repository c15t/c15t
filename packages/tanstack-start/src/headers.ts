import type {
	ConsentRequestHeaderInputs,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';

/** Normalized request values used to resolve consent policy. */
export type ConsentRequestInputs = ConsentRequestHeaderInputs &
	ResolveInitFromManifestInputs;

export {
	CONSENT_REQUEST_HEADER_NAMES,
	COUNTRY_HEADERS,
	consentInputsToOverrides,
	extractConsentRequestInputs,
	parseGlobalPrivacyControl,
	REGION_HEADERS,
} from '@c15t/schema/types';
