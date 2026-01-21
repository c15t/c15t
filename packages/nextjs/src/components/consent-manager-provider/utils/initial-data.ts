import type { Overrides } from '@c15t/react';
import type { GlobalVendorList, InitOutput, SSRInitialData } from 'c15t';
import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';

/** Default GVL endpoint */
const GVL_ENDPOINT = 'https://gvl.consent.io';

/**
 * Performs the init fetch request.
 * All async work (header resolution) should be done before calling this.
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
 * Performs the GVL fetch request.
 * All async work (header resolution) should be done before calling this.
 */
function performGVLFetch(
	vendorIds: number[],
	geoHeaders: Record<string, string>
): Promise<GlobalVendorList | null | undefined> {
	const url = new URL(GVL_ENDPOINT);
	if (vendorIds.length > 0) {
		url.searchParams.set('vendorIds', vendorIds.join(','));
	}

	return fetch(url.toString(), { headers: geoHeaders })
		.then((response) => {
			// 204 means non-IAB region - no GVL needed
			if (response.status === 204) {
				return null;
			}

			if (response.ok) {
				return response.json().then((gvl: GlobalVendorList) => {
					// Validate required fields
					if (!gvl.vendorListVersion || !gvl.purposes || !gvl.vendors) {
						return undefined;
					}
					return gvl;
				});
			}
			return undefined;
		})
		.catch(() => undefined);
}

/**
 * Configuration for IAB GVL prefetch
 */
interface IABPrefetchConfig {
	/** Whether IAB mode is enabled */
	enabled: boolean;
	/** Vendor IDs to fetch */
	vendors: Record<number, string>;
}

/**
 * Fetches both init and GVL data in parallel for SSR.
 *
 * @param backendURL - The backend URL to fetch from
 * @param initialHeaders - Request headers for geo-location
 * @param options - Additional options
 * @returns The combined SSR initial data
 *
 * @example
 * ```typescript
 * const initialData = await getC15TInitialData(
 *   '/api/c15t',
 *   headers(),
 *   {
 *     overrides: { country: 'DE' },
 *     iab: { enabled: true, vendors: { 755: 'google' } }
 *   }
 * );
 * ```
 */
export async function getC15TInitialData(
	backendURL: string,
	initialHeaders: Headers | Promise<Headers>,
	options?: {
		overrides?: Overrides;
		iab?: IABPrefetchConfig;
	}
): Promise<SSRInitialData | undefined> {
	const { overrides, iab } = options ?? {};

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

	// Build geo headers for GVL
	const geoHeaders: Record<string, string> = {};
	if (relevantHeaders['x-c15t-country']) {
		geoHeaders['x-c15t-country'] = relevantHeaders['x-c15t-country'];
	}
	if (relevantHeaders['x-c15t-region']) {
		geoHeaders['x-c15t-region'] = relevantHeaders['x-c15t-region'];
	}

	// Start BOTH fetches simultaneously (no awaits in between)
	const initPromise = performInitFetch(normalizedURL, initHeaders);
	const gvlPromise =
		iab?.enabled && iab.vendors
			? performGVLFetch(Object.keys(iab.vendors).map(Number), geoHeaders)
			: Promise.resolve(undefined);

	// Wait for both to complete
	const [init, gvl] = await Promise.all([initPromise, gvlPromise]);

	if (!init) {
		return undefined;
	}

	return { init, gvl };
}
