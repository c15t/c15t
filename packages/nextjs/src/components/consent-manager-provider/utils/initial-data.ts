import type { ContractsOutputs } from '@c15t/backend/contracts';
import type { Overrides } from '@c15t/react';
import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';

type ShowConsentBanner = ContractsOutputs['consent']['showBanner'] | undefined;

export async function getC15TInitialData(
	backendURL: string,
	initialHeaders: Headers | Promise<Headers>,
	overrides?: Overrides
): Promise<ShowConsentBanner> {
	const headers = await initialHeaders;
	const relevantHeaders = extractRelevantHeaders(headers);

	// We can't fetch from the server if the headers are not present like when dynamic params is set to force-static
	// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamicparams
	if (Object.keys(relevantHeaders).length === 0) {
		return undefined;
	}

	const normalizedURL = normalizeBackendURL(backendURL, headers);

	if (!normalizedURL) {
		return undefined;
	}

	if (overrides?.country) {
		relevantHeaders['x-c15t-country'] = overrides.country;
	}
	if (overrides?.region) {
		relevantHeaders['x-c15t-region'] = overrides.region;
	}
	if (overrides?.language) {
		relevantHeaders['accept-language'] = overrides.language;
	}

	try {
		const response = await fetch(`${normalizedURL}/init`, {
			method: 'GET',
			headers: relevantHeaders,
		});

		if (response.ok) {
			return await response.json();
		}
	} catch {
		// Silently handle any network or parsing errors
	}

	return undefined;
}
