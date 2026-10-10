/**
 * Direct-init SSR: the handle gives `/ssr` the `hosted()` mode, so
 * `loadConsent` calls the fixture backend's `/init` on the request path and
 * the consent round-trip lands in the page's TTFB. This is the arm manifest
 * mode is measured against. The backend URL is same-origin, so
 * `event.fetch` answers it in-process.
 */
export { loadConsent as load } from '@c15t/svelte/kit';
