/**
 * `@c15t/svelte/kit` — the SvelteKit server layer.
 *
 * Server-only. Importing this from a component that runs in the browser will
 * pull `@c15t/translations/all` and the manifest resolver into the client
 * bundle; keep it to `hooks.server.ts`, `+*.server.ts`, and `+server.ts`.
 *
 * ```ts
 * // src/hooks.server.ts
 * export const handle = c15tHandle();
 *
 * // src/routes/api/c15t/[...path]/+server.ts
 * export const { GET } = createSvelteKitConsentRouteHandlers({ backendURL });
 *
 * // src/routes/+layout.server.ts
 * export const load = async (event) => ({
 *   prefetch: await loadConsent(event, { initRoute: '/api/c15t' }),
 * });
 * ```
 */
export type { C15tHandleOptions } from './handle';
export { c15tHandle } from './handle';
export type { LoadConsentOptions } from './load-consent';
export { loadConsent } from './load-consent';
export type { SvelteKitConsentRouteOptions } from './routes';
export { createSvelteKitConsentRouteHandlers } from './routes';
export type {
	C15tLocals,
	ConsentManifestOptions,
	ConsentRequestInputs,
	ConsentRequestOptions,
} from './types';

export type { KernelConfig } from '@c15t/core';
export { custom, hosted } from '@c15t/core';
export { offline } from '../transports/offline';
