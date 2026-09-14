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
 *   const backendURL = 'https://consent.example.com';
 *
 *   // Declared in your module: the Start compiler splits server code at
 *   // this `createServerFn().handler()` call site.
 *   const getConsentState = createServerFn({ method: 'GET' }).handler(
 *     createConsentStateHandler({ backendURL })
 *   );
 *
 *   export const Route = createRootRoute({
 *     ...consentLoaderOptions,
 *     loader: () => getConsentState(),
 *     component: RootComponent,
 *   });
 *
 *   function RootComponent() {
 *     const state = Route.useLoaderData();
 *     return (
 *       <ConsentRoot state={state} backendURL={backendURL}>
 *         <Outlet />
 *       </ConsentRoot>
 *     );
 *   }
 *
 *   // any component
 *   import { useConsent } from '@c15t/tanstack-start';
 *   const allowed = useConsent('marketing');
 *
 * `backendURL` is the c15t backend itself, not the app's `/api/c15t` route:
 * init goes to the same-origin route by default, saves go to
 * `${backendURL}/subjects`, which the route does not proxy unless you opt
 * in with `createConsentServerRoute({ proxy: true })`; then
 * `backendURL="/api/c15t"` is the intended value.
 *
 * Server helpers return serializable data and avoid module-level runtime
 * caches, so concurrent requests never share a kernel.
 */

export { buildPrefetchScript, type PrefetchOptions } from '@c15t/core';
// oxlint-disable-next-line oxc/no-barrel-file -- Preserve declaration order, interface shape, and public compatibility.
export * from '@c15t/react';
export { consentPrefetchHead } from './libs/prefetch-head';
export type { ConsentRootProps } from './root';
export { ConsentRoot, DEFAULT_INIT_ROUTE } from './root';
export type { ConsentPrefetchHead, ConsentPrefetchHeadOptions } from './types';
