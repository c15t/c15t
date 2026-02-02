'use client';

import {
	ConsentManagerProvider as BaseProvider,
	type ConsentManagerProviderProps as BaseProviderProps,
} from '@c15t/react';
import type { InitialDataPromise } from '../../types';
import { enrichOptions } from '../consent-manager-provider/utils/enrich-options';

/**
 * Props for the client-side ConsentManagerProvider
 */
export interface ClientConsentManagerProviderProps {
	/**
	 * React children to render within the provider
	 */
	children: BaseProviderProps['children'];
	/**
	 * Initial consent data fetched from the server.
	 * Pass the result of fetchInitialData() from a server component.
	 */
	initialData?: InitialDataPromise;
	/**
	 * Configuration options for the consent manager.
	 * This can include callbacks and scripts since this is a client component.
	 */
	options: BaseProviderProps['options'];
}

/**
 * Client-side ConsentManagerProvider that accepts pre-fetched initial data.
 *
 * Use this component in a client component alongside fetchInitialData() in
 * a parent server component for explicit server/client boundary control.
 *
 * @example
 * ```tsx
 * // Server Component (no 'use client')
 * import { fetchInitialData } from '@c15t/nextjs'
 * import { ConsentProvider } from './provider'
 *
 * export function ConsentManager({ children }) {
 *   const initialData = fetchInitialData({ backendURL: '/api/c15t' })
 *   return <ConsentProvider initialData={initialData}>{children}</ConsentProvider>
 * }
 *
 * // Client Component (provider.tsx)
 * 'use client'
 * import { ConsentManagerProvider } from '@c15t/nextjs/client'
 *
 * export function ConsentProvider({ initialData, children }) {
 *   return (
 *     <ConsentManagerProvider
 *       initialData={initialData}
 *       options={{
 *         mode: 'c15t',
 *         backendURL: '/api/c15t',
 *         callbacks: { onConsentSet: (r) => console.log(r) },
 *       }}
 *     >
 *       {children}
 *     </ConsentManagerProvider>
 *   )
 * }
 * ```
 */
export function ConsentManagerProvider({
	children,
	initialData,
	options,
}: ClientConsentManagerProviderProps) {
	// Promise is passed directly through - c15t core handles resolving it
	// React serializes the Promise when passing from server to client component
	return (
		<BaseProvider
			options={enrichOptions({
				options,
				initialData,
				usingAppDir: true,
			})}
		>
			{children}
		</BaseProvider>
	);
}
