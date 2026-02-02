// Export types
import type {
	Overrides,
	ConsentManagerProviderProps as ReactConsentManagerProviderProps,
} from '@c15t/react';

/**
 * NextJS-specific configuration options for the ConsentManagerProvider.
 *
 * @remarks
 * This interface extends the base React ConsentManagerProviderProps but excludes
 * callback functionality. Callbacks are omitted to simplify the NextJS integration
 * and prevent potential conflicts with server-side rendering.
 *
 * @example
 * ```tsx
 * // Basic NextJS consent manager setup without callbacks
 * <ConsentManagerProvider
 *   options={{
 *     mode: 'c15t',
 *     backendURL: '/api/c15t',
 *     theme: customTheme
 *   }}
 * >
 *   {children}
 * </ConsentManagerProvider>
 * ```
 *
 * @see {@link ReactConsentManagerProviderProps} For the complete React provider props
 * @public
 */
export type AppDirectoryConsentManagerProviderProps = Omit<
	ReactConsentManagerProviderProps,
	'options'
> & {
	/**
	 * Configuration options for the consent manager without callback functions.
	 * This ensures NextJS compatibility by removing potentially problematic callbacks.
	 */
	options: Omit<
		ReactConsentManagerProviderProps['options'],
		'callbacks' | 'scripts'
	>;
};

export type InitialDataPromise = NonNullable<
	ReactConsentManagerProviderProps['options']['store']
>['_initialData'];

export type InitialData = Awaited<InitialDataPromise>;

/**
 * Options for the fetchInitialData function.
 */
export interface FetchInitialDataOptions {
	/**
	 * The backend URL to fetch consent data from
	 */
	backendURL: string;
	/**
	 * Optional overrides for geo-location
	 */
	overrides?: Overrides;
}

/**
 * Props for the client-side ConsentManagerProvider
 */
export interface ClientConsentManagerProviderProps {
	/**
	 * React children to render within the provider
	 */
	children: ReactConsentManagerProviderProps['children'];
	/**
	 * Initial consent data fetched from the server.
	 * Pass the result of fetchInitialData() from a server component.
	 */
	initialData?: InitialDataPromise;
	/**
	 * Configuration options for the consent manager.
	 * This can include callbacks and scripts since this is a client component.
	 */
	options: ReactConsentManagerProviderProps['options'];
}
