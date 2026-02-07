import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Server-side rendered consent management wrapper for Next.js App Router
 *
 * This component pre-fetches consent data on the server for faster hydration.
 * The fetchInitialData() function uses Next.js headers() API, which means:
 * - The route will be dynamically rendered (not statically generated)
 * - Works in server components and dynamic routes
 *
 * @see https://c15t.com/docs/frameworks/nextjs/ssr
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	const ssrData = fetchInitialData({
		backendURL: "/api/c15t",
	});

	return (
		<ConsentManagerProvider ssrData={ssrData}>
			{children}
		</ConsentManagerProvider>
	);
}
