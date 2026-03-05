import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Server-side rendered consent management wrapper for Next.js App Router
 *
 * This component prefetches data like geo-locatiion,localized i18n strings & more from the backend
 * and streams it to the client, where ConsentManagerProvider can use it to render the appropriate consent banner and dialog.
 *
 * If your app is fully client-side rendered (or static), you can use ConsentManagerProvider directly without this wrapper.
 * This will make the route dynamic as it uses headers() from next/headers.
 *
 * Can increase TTFB for client-side only apps due to the need to wait for this data before rendering the provider, so only use this approach if you need the SSR features or are already using a dynamic route.
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	// We don't need to await this as c15t awaits this promise later when needed
	const ssrData = fetchInitialData({
		backendURL: '/api/self-host',
	});

	return (
		<ConsentManagerProvider ssrData={ssrData}>
			{children}
		</ConsentManagerProvider>
	);
}
