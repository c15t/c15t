/**
 * The browser manifest resolver, as the chunk `clientMode()` loads for
 * `manifest({ resolve: 'browser' })`.
 *
 * Bundled with everything it imports except the per-language translation
 * modules, for the reason `lazy-hosted.ts` gives.
 *
 * @internal
 */
export { createBrowserManifestTransport } from '../transports/manifest-browser';
