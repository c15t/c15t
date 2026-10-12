/**
 * Same wiring as `ssr-manifest`; the runner seeds a consent cookie before
 * navigating, so the server resolves "already consented" and renders no
 * banner at all.
 */
export { loadConsent as load } from '@c15t/svelte/kit';
