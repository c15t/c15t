import { fetchSSRData } from '@c15t/react/server';
import type { SSRInitialData } from 'c15t';
import { headers as nextHeaders } from 'next/headers';
import type { FetchInitialDataOptions } from '~/types';

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
	// Get Next.js headers
	const headers = await nextHeaders();

	// Delegate to framework-agnostic implementation
	return fetchSSRData({
		...options,
		headers,
	});
}
