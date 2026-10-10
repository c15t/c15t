/**
 * Consent modes for `@c15t/astro`.
 *
 * Astro evaluates `astro.config.mjs` at build time, but the browser boot
 * script is a string the integration injects. A transport factory cannot
 * cross that boundary, so the integration takes the plain data
 * `manifest()`, `hosted()` and `offline()` from `@c15t/core/modes` return,
 * and the server and the browser each turn it into a transport. The
 * browser's side is `./transport.ts`.
 */

export { hosted, manifest, offline } from '@c15t/core/modes';
