/**
 * `@c15t/tanstack-start` client entry.
 *
 * Pattern:
 *   // src/routes/__root.tsx
 *   import { createRootRoute, Outlet } from '@tanstack/react-router';
 *   import { createServerFn } from '@tanstack/react-start';
 *   import { ConsentRoot } from '@c15t/tanstack-start';
 *   import {
 *     consentLoaderOptions,
 *     createConsentStateHandler,
 *   } from '@c15t/tanstack-start/server';
 *
 *   // Declared in your module: the Start compiler splits server code at
 *   // this `createServerFn().handler()` call site.
 *   const getConsentState = createServerFn({ method: 'GET' }).handler(
 *     createConsentStateHandler()
 *   );
 *
 *   export const Route = createRootRoute({
 *     ...consentLoaderOptions,
 *     loader: async () => ({ consent: await getConsentState() }),
 *     component: RootComponent,
 *   });
 *
 *   function RootComponent() {
 *     const { consent } = Route.useLoaderData();
 *     return (
 *       <ConsentRoot state={consent}>
 *         <Outlet />
 *       </ConsentRoot>
 *     );
 *   }
 *
 *   // any component
 *   import { useConsent } from '@c15t/tanstack-start';
 *   const allowed = useConsent('marketing');
 *
 * The backend URL comes from `consentManifest()` in `vite.config.ts`, and
 * the state carries it, the mode and the route prefix to `ConsentRoot`.
 * The browser gets init from `${backendURL}/init` and saves to
 * `${backendURL}/subjects`. Apps that mount `createConsentRoute()` at
 * `/api/c15t/$` pass `routePrefix: '/api/c15t'` to
 * `createConsentStateHandler()` to resolve init on their own origin, the
 * same option Next.js `defineConsentConfig` takes. With
 * `createConsentRoute({ proxy: true })`, also pass `proxy: true` there;
 * init and saves then both go through the route.
 *
 * `manifest()`, `hosted()` and `offline()` here are plain data for
 * `createConsentStateHandler({ mode })`. `ConsentRoot` loads the code for a
 * mode only when the browser runs it.
 *
 * Server helpers return serializable data and avoid module-level runtime
 * caches, so concurrent requests never share a kernel.
 */

export { buildPrefetchScript, type PrefetchOptions } from '@c15t/core';
export type {
	ConsentMode,
	ConsentModeType,
	HostedMode,
	HostedModeOptions,
	ManifestMode,
	ManifestModeInputs,
	ManifestModeOptions,
	OfflineMode,
	OfflineModeOptions,
} from '@c15t/core/modes';
// These data factories replace the transport implementations of the same
// names that the re-export of `@c15t/react` below would otherwise provide.
export { hosted, manifest, offline } from '@c15t/core/modes';
// oxlint-disable-next-line oxc/no-barrel-file -- Preserve declaration order, interface shape, and public compatibility.
export * from '@c15t/react';
export { consentPrefetchHead } from './libs/prefetch-head';
export type { ConsentRootProps } from './root';
export { ConsentRoot } from './root';
export type { ConsentPrefetchHead, ConsentPrefetchHeadOptions } from './types';
