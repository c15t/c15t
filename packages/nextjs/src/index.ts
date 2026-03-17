/**
 * Main entry point for the C15T Next.js integration package.
 * Re-exports all necessary components, hooks, and utilities from the React package
 * and middleware for seamless integration with Next.js applications.
 *
 * @packageDocumentation
 * @see {@link @c15t/react} for React components and hooks
 * @see {@link ./middleware} for Next.js middleware integration
 */

export * from '@c15t/react';
export {
	getPrefetchedInitialData,
	PrefetchC15T,
	prefetchInitialData,
} from './libs/browser-initial-data';
export { fetchInitialData } from './libs/initial-data';
export type {
	BrowserInitialDataOptions,
	ConsentManagerProps,
	FetchInitialDataOptions,
	InitialDataPromise,
	PrefetchC15TProps,
} from './types';
