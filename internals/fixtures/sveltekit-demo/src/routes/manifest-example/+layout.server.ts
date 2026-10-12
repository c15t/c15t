// Resolves from the backend's cached policy manifest, the mode
// `src/hooks.server.ts` gives this area, instead of calling the backend's
// `/init` on every page load. The browser re-inits through `/api/c15t`.
export { loadConsent as load } from '@c15t/svelte/kit';
