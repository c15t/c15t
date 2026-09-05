/**
 * The package's lazy IAB factory.
 *
 * `<ConsentManagerProvider>` is imported by every app, IAB or not, so it
 * cannot import `@c15t/iab` statically — that would put ~15 KB gzipped of
 * TCF code in the layout chunk of apps that never turn IAB on. The runtime
 * calls `createIAB` synchronously, so the deferral happens here:
 * {@link lazyCreateIAB} hands back a handle immediately and forwards to
 * the real one once the dynamic import resolves.
 *
 * Surfaces that render against the handle wait for {@link whenIABReady}
 * first, so they never read methods that have not arrived.
 */

import { createLazyIABFactory } from '@c15t/core/runtime';

import type { ProviderIABOptions } from './types';

const factory = createLazyIABFactory(() => import('@c15t/iab'));

/** The `createIAB` the provider hands the runtime. */
export const lazyCreateIAB = factory.create;

/** Resolves once every pending `@c15t/iab` load has settled. */
export const whenIABReady = factory.whenReady;

/**
 * Whether IAB is configured for this provider.
 *
 * Mirrors the runtime's own check, so the provider only wires the loader
 * for apps that will actually mount a CMP.
 *
 * @param iab - The provider's `iab` option.
 * @returns `true` when the runtime would mount the TCF addon.
 */
export const isIABConfigured = function isIABConfigured(
	iab: ProviderIABOptions | undefined
): boolean {
	return Boolean(iab) && (iab as { enabled?: boolean }).enabled !== false;
};
