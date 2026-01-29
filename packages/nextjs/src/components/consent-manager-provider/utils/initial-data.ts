import type { Overrides } from '@c15t/react';
import type { InitOutput, SSRInitialData } from 'c15t';
import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';

/**
 * Performs the init fetch request.
 * All async work (header resolution) should be done before calling this.
 * GVL is now included in the init response when server has it configured.
 */
function performInitFetch(
	normalizedURL: string,
	relevantHeaders: Record<string, string>
): Promise<InitOutput | undefined> {
	return fetch(`${normalizedURL}/init`, {
		method: 'GET',
		headers: relevantHeaders,
	})
		.then((response) => {
			if (response.ok) {
				return response.json() as Promise<InitOutput>;
			}
			return undefined;
		})
		.catch(() => undefined);
}

/**
 * Fetches init data for SSR.
 * GVL is now included in the init response when the server has it configured.
 *
 * @param backendURL - The backend URL to fetch from
 * @param initialHeaders - Request headers for geo-location
 * @param options - Additional options
 * @returns The SSR initial data
 *
 * @example
 * ```typescript
 * const initialData = await getC15TInitialData(
 *   '/api/c15t',
 *   headers(),
 *   { overrides: { country: 'DE' } }
 * );
 * ```
 */
export async function getC15TInitialData(
	backendURL: string,
	initialHeaders: Headers | Promise<Headers>,
	options?: {
		overrides?: Overrides;
	}
): Promise<SSRInitialData | undefined> {
	const { overrides } = options ?? {};

	// Resolve headers once (this is the only await before fetches)
	const headers = await initialHeaders;
	const relevantHeaders = extractRelevantHeaders(headers);

	// We can't fetch from the server if the headers are not present
	if (Object.keys(relevantHeaders).length === 0) {
		return undefined;
	}

	// Normalize URL synchronously
	const normalizedURL = normalizeBackendURL(backendURL, headers);
	if (!normalizedURL) {
		return undefined;
	}

	// Apply overrides to headers
	const initHeaders = { ...relevantHeaders };
	if (overrides?.country) {
		initHeaders['x-c15t-country'] = overrides.country;
	}
	if (overrides?.region) {
		initHeaders['x-c15t-region'] = overrides.region;
	}
	if (overrides?.language) {
		initHeaders['accept-language'] = overrides.language;
	}

	// Fetch init data (GVL is included in response when server has it configured)
	const init = await performInitFetch(normalizedURL, initHeaders);

	if (!init) {
		return undefined;
	}

	// GVL is now part of the init response
	return { init, gvl: init.gvl };
}
