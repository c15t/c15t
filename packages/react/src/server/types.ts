import type { Overrides, SSRInitialData } from '@c15t/core';

/**
 * Base options for SSR data fetching, shared across framework integrations.
 *
 * @remarks
 * This interface contains the common options used by all framework-specific
 * SSR data fetching functions. Framework packages like @c15t/nextjs use
 * this directly, while the generic fetchSSRData extends it with headers.
 *
 * @public
 */
export interface FetchSSRDataOptionsBase {
	/**
	 * The backend URL to fetch consent data from.
	 * Can be absolute (https://...) or relative (/api/consent). A relative
	 * URL resolves against the request's `host` header.
	 */
	backendURL: string;

	/**
	 * Resolve a relative `backendURL` against the request's `forwarded`,
	 * `x-forwarded-host` and `x-forwarded-proto` headers instead of `host`.
	 * Any client can send those headers, so set this only behind a proxy
	 * that sets them and drops incoming ones. Also forwards those three
	 * headers to the backend, which is skipped otherwise.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

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
 * @remarks
 * This is the framework-agnostic interface for SSR data fetching.
 * It extends FetchSSRDataOptionsBase with a required headers parameter.
 * Framework-specific packages (like @c15t/nextjs) use the base interface
 * and resolve headers internally.
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
