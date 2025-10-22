/**
 * Main entry point for the C15T Next.js integration package.
 * Re-exports all necessary components, hooks, and utilities from the React package
 * and middleware for seamless integration with Next.js applications.
 *
 * @packageDocumentation
 * @see {@link @c15t/react} for React components and hooks
 * @see {@link ./middleware} for Next.js middleware integration
 */

export { withInitialC15TData } from './components/consent-manager-provider/initial-data-hoc';
export { ConsentManagerProvider } from './components/consent-manager-provider/pages';
export * from './shared';
export type { InitialDataPromise } from './types';
