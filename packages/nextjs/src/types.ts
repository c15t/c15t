// Export types
import type { ConsentManagerProviderProps as ReactConsentManagerProviderProps } from '@c15t/react';

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
 *     react: {
 *       theme: customTheme
 *     }
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
	options: Omit<ReactConsentManagerProviderProps['options'], 'callbacks'>;
};

export type InitialDataPromise = NonNullable<
	ReactConsentManagerProviderProps['options']['store']
>['_initialData'];

export type InitialData = Awaited<InitialDataPromise>;
