/**
 * Server-side utilities for SSR data fetching.
 *
 * @remarks
 * This module provides framework-agnostic SSR utilities for fetching
 * consent data on the server. It works with any framework that provides
 * access to standard Web API Headers.
 *
 * Framework-specific packages (like @c15t/nextjs) wrap these utilities
 * with their own header resolution logic.
 *
 * @example
 * ```ts
 * // Direct usage in any framework
 * import { fetchSSRData, extractRelevantHeaders, normalizeBackendURL } from '@c15t/react/server';
 *
 * // In your server handler
 * const data = await fetchSSRData({
 *   backendURL: '/api/consent',
 *   headers: request.headers,
 *   debug: true
 * });
 * ```
 *
 * @packageDocumentation
 */

export { fetchSSRData } from './fetch-ssr-data';
export { extractRelevantHeaders } from './headers';
export { createSSRInitCacheKey } from './init-cache-key';
export { normalizeBackendURL, validateBackendURL } from './normalize-url';
export type {
	FetchSSRDataOptions,
	FetchSSRDataOptionsBase,
	FetchSSRDataResult,
} from './types';
