/**
 * Server-side utilities for SSR data fetching.
 *
 * @remarks
 * This module provides framework-agnostic SSR utilities for fetching
 * consent data on the server. It works with any framework that provides
 * access to standard Web API Headers.
 *
 * @example
 * ```ts
 * // In a SvelteKit server load function
 * import { fetchSSRData, extractRelevantHeaders, normalizeBackendURL } from '@c15t/svelte/server';
 *
 * export async function load({ request }) {
 *   const data = await fetchSSRData({
 *     backendURL: '/api/consent',
 *     headers: request.headers,
 *     debug: true
 *   });
 *   return { consent: data };
 * }
 * ```
 *
 * @packageDocumentation
 */

export { fetchSSRData } from './fetch-ssr-data';
export { extractRelevantHeaders } from './headers';
export { normalizeBackendURL, validateBackendURL } from './normalize-url';
export type {
	FetchSSRDataOptions,
	FetchSSRDataOptionsBase,
	FetchSSRDataResult,
} from './types';
