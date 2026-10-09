/**
 * What client manifest mode loads to resolve a manifest in the browser: the
 * browser manifest resolver, which bundles English and loads other
 * languages on demand.
 *
 * `kernel.ts` imports this module dynamically, as one chunk (Nuxt's client
 * manifest mode imports it statically instead; see
 * `plugin-client-manifest.nuxt.ts`). A module whose chunk exports the
 * bindings directly needs no namespace helper, so the app entry never
 * imports a helper from the resolver's chunk.
 *
 * @internal
 */
// oxlint-disable-next-line oxc/no-barrel-file -- One chunk for client manifest mode; see above.
export { createBrowserManifestTransport } from '@c15t/core/transports/manifest-browser';
