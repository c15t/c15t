import {
	createSSRInitCacheKey,
	fetchSSRData,
	normalizeBackendURL,
} from '@c15t/react/server';
import type { SSRInitialData } from 'c15t';
import { unstable_cache } from 'next/cache';
import { headers as nextHeaders } from 'next/headers';
import type { FetchInitialDataOptions } from '~/types';

const DEFAULT_REVALIDATE_SECONDS = 1;

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

	const cacheKey = createSSRInitCacheKey({
		normalizedURL,
		headers,
		overrides: options.overrides,
	});
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
