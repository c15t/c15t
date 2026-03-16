import type { Overrides, SSRInitialData } from 'c15t';

/**
 * Base options for SSR data fetching, shared across framework integrations.
 *
 * @public
 */
export interface FetchSSRDataOptionsBase {
	/**
	 * The backend URL to fetch consent data from.
	 * Can be absolute (https://...) or relative (/api/consent).
	 */
	backendURL: string;

	/**
	 * Optional overrides for geo-location.
	 */
	overrides?: Overrides;

	/**
	 * Enable debug logging to see SSR fetch details in server console.
	 * @default false
	 */
	debug?: boolean;
}

/**
 * Options for the fetchSSRData function.
 *
 * @public
 */
export interface FetchSSRDataOptions extends FetchSSRDataOptionsBase {
	/**
	 * Request headers from the framework.
	 * These should be the incoming request headers that contain
	 * geo-location information (cf-ipcountry, x-vercel-ip-country, etc.)
	 */
	headers: Headers;
}

/**
 * Result of the SSR data fetch.
 */
export type FetchSSRDataResult = SSRInitialData | undefined;
