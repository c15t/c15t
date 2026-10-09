/**
 * `@c15t/svelte/kit` — the SvelteKit server layer.
 *
 * Server-only: keep it to `hooks.server.ts`, `+*.server.ts` and
 * `+server.ts`. The modes here are plain data; `<ConsentRoot>` from
 * `@c15t/svelte` turns them into a transport in the browser.
 *
 * ```ts
 * // src/hooks.server.ts
 * import { c15tHandle } from '@c15t/svelte/kit';
 *
 * export const handle = c15tHandle();
 *
 * // src/routes/+layout.server.ts
 * export { loadConsent as load } from '@c15t/svelte/kit';
 * ```
 *
 * ```svelte
 * <!-- src/routes/+layout.svelte -->
 * <ConsentRoot state={data.consent}>
 * ```
 *
 * Prerendered pages also need the consent route, and its prefix on the
 * handle:
 *
 * ```ts
 * // src/routes/api/c15t/[...path]/+server.ts
 * export const { GET } = createConsentRoute();
 *
 * // src/hooks.server.ts
 * export const handle = c15tHandle({ routePrefix: '/api/c15t' });
 * ```
 */
export type { C15tHandle, C15tHandleOptions } from './handle';
export { c15tHandle } from './handle';
export type { LoadConsentOptions } from './load-consent';
export { loadConsent } from './load-consent';
export type {
	ConsentProxyOptions,
	ConsentProxyRouteHandlers,
	ConsentRouteHandlers,
	ConsentRouteHandlersFor,
	ConsentRouteOptions,
} from './routes';
export { createConsentRoute } from './routes';
export type {
	C15tLocals,
	ConsentRequestInputs,
	ConsentRequestOptions,
	ConsentState,
} from './types';
export type { ConsentRootState } from '../types';

export type {
	ConsentMode,
	HostedMode,
	HostedModeOptions,
	ManifestMode,
	ManifestModeOptions,
	OfflineMode,
	OfflineModeOptions,
} from '@c15t/core/modes';
export { hosted, manifest, offline } from '@c15t/core/modes';
