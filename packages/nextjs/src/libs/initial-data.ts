import {
	extractRelevantHeaders,
	fetchSSRData,
	normalizeBackendURL,
} from '@c15t/react/server';
import type { SSRInitialData } from 'c15t';
import { unstable_cache } from 'next/cache';
import { headers as nextHeaders } from 'next/headers';
import type { FetchInitialDataOptions } from '~/types';

const DEFAULT_REVALIDATE_SECONDS = 1;

function createNextCacheKey(
	normalizedURL: string,
	headers: Headers,
	options: FetchInitialDataOptions
): string {
	const relevantHeaders = extractRelevantHeaders(headers);

	const effectiveCountry =
		options.overrides?.country ?? relevantHeaders['x-c15t-country'] ?? '';
	const effectiveRegion =
		options.overrides?.region ?? relevantHeaders['x-c15t-region'] ?? '';
	const effectiveLanguage =
		options.overrides?.language ?? relevantHeaders['accept-language'] ?? '';
	const gpc = relevantHeaders['sec-gpc'] ?? '';

	return JSON.stringify({
		normalizedURL,
		country: effectiveCountry,
		region: effectiveRegion,
		language: effectiveLanguage,
		gpc,
	});
}

/**
 * Fetches initial consent data on the server for SSR hydration.
 *
 * **IMPORTANT: Do NOT await this function in Server Components.**
 * Pass the Promise directly to your client component, which passes it
 * to ConsentManagerProvider's `ssrData` option. The provider awaits
 * it internally, allowing Next.js to stream the response while data loads.
 *
 * @param options - Configuration options
 * @param options.backendURL - Backend URL (absolute or relative)
 * @param options.overrides - Optional geo-location overrides
 * @param options.debug - Enable debug logging
 * @returns The SSR initial data promise
 *
 * @example
 * ```tsx
 * // Server Component (layout.tsx)
 * const initialData = fetchInitialData({
 *   backendURL: '/api/consent',
 *   debug: process.env.NODE_ENV === 'development'
 * });
 * return <ClientProvider ssrData={initialData}>{children}</ClientProvider>
 * ```
 */
export async function fetchInitialData(
	options: FetchInitialDataOptions
): Promise<SSRInitialData | undefined> {
	const headers = await nextHeaders();
	const normalizedURL = normalizeBackendURL(options.backendURL, headers);
	if (!normalizedURL) {
		return undefined;
	}

	const revalidateSeconds = options.nextCache?.revalidateSeconds;
	if (revalidateSeconds === false) {
		return fetchSSRData({
			...options,
			backendURL: normalizedURL,
			headers,
		});
	}

	const cacheKey = createNextCacheKey(normalizedURL, headers, options);
	const cacheTTL = revalidateSeconds ?? DEFAULT_REVALIDATE_SECONDS;

	const cachedFetch = unstable_cache(
		() =>
			fetchSSRData({
				...options,
				backendURL: normalizedURL,
				headers,
			}),
		['c15t:nextjs:fetchInitialData', cacheKey],
		{
			revalidate: cacheTTL,
		}
	);

	return cachedFetch();
}
