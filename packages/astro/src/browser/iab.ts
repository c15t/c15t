/**
 * The page's lazy IAB factory.
 *
 * The runtime calls `createIAB` synchronously, but a static import would
 * put the whole TCF implementation in the boot chunk of every page,
 * including sites that never turn IAB on. `createLazyIABFactory` from
 * `@c15t/core/runtime` keeps the synchronous call site and defers the
 * bytes; {@link whenIABReady} closes the window between the two, and the
 * client awaits it before mounting the IAB dialog.
 */

import { createLazyIABFactory } from '@c15t/core/runtime';

const defaultFactory = createLazyIABFactory(() => import('@c15t/iab'));

/** The `createIAB` the client hands the runtime. */
export const lazyCreateIAB = defaultFactory.create;

/** Resolves once every pending `@c15t/iab` load has settled. */
export const whenIABReady = defaultFactory.whenReady;
