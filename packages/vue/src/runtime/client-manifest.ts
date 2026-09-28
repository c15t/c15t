/**
 * What client manifest mode loads to resolve a manifest in the browser: the
 * manifest transport and every locale's base translations.
 *
 * `kernel.ts` imports this module dynamically, as one chunk (Nuxt's client
 * manifest mode imports it statically instead; see
 * `plugin-client-manifest.nuxt.ts`). Importing the
 * two packages with separate `import()` calls made Vite 8 (Rolldown) build a
 * namespace object for the translations chunk and place its shared
 * `__export` helper in that chunk. The app entry then imported the helper
 * from there, so every Nuxt page downloaded all locales (about 56 KB gzip)
 * in its first load, in server manifest and hosted mode too. A module whose
 * chunk exports the bindings directly needs no namespace helper.
 *
 * @internal
 */
// oxlint-disable-next-line oxc/no-barrel-file -- One chunk for client manifest mode; see above.
export { createManifestTransport } from '@c15t/core/transports/manifest';
export { baseTranslations } from '@c15t/translations/all';
