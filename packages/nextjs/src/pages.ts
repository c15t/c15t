/**
 * Main entry point for the C15T Next.js integration package for Pages Router.
 * Re-exports all necessary components, hooks, and utilities from the React package
 * and middleware for seamless integration with Next.js applications.
 *
 * @packageDocumentation
 * @see {@link @c15t/react} for React components and hooks
 * @see {@link ./middleware} for Next.js middleware integration
 */

// biome-ignore assist/source/organizeImports: Ensure ConsentManagerProvider is overridden by the Next.js-specific implementation
export * from './shared';
export { fetchInitialData } from './fetch-initial-data-pages';
export { ConsentManagerProvider } from './components/consent-manager-provider/pages';
export type {
	FetchInitialDataOptions,
	InitialDataPromise,
	ClientConsentManagerProviderProps,
} from './types';
