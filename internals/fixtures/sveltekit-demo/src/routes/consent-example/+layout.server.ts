// Resolves with the hosted mode `src/hooks.server.ts` gives this area. A
// prerendered page is built once and sent to every visitor, so while
// building it carries no visitor's consent and the browser resolves it.
export { loadConsent as load } from '@c15t/svelte/kit';
