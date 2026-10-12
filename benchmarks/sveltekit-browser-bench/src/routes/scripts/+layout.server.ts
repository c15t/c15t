/**
 * Manifest SSR: the handle gives this route the `manifest()` mode, so
 * `loadConsent` resolves the cached fixture manifest in-process. The
 * backend never sits on the request path.
 */
export { loadConsent as load } from '@c15t/svelte/kit';
