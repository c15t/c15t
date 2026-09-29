---
packages:
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/svelte": patch
  "@c15t/astro": patch
  "@c15t/browser": patch
  "@c15t/cli": patch
---

### Keep app `i18n.messages` overrides when the backend sends translations

In hosted and manifest mode, the translations from `/init`, from a server prefetch or from a manifest replaced the app's `i18n.messages` for the same language, so a key overridden in code showed the backend's copy instead. This affected React, Next.js and TanStack Start through the React provider, Svelte and SvelteKit (including `resolveConsent()` prefetches), Astro and `@c15t/browser`.

The backend copy is now the base for the visitor's language and the app's `i18n.messages` for that language override it key by key, as in v2. Keys the app does not override keep the backend's copy. Overrides for other languages are not applied. A regional language such as `de-AT` uses the overrides under `de` when there is no `de-AT` entry. Apps that pass complete translation bundles as `i18n.messages` will now show that copy in place of copy edited on the backend for the same language.

Astro also deep-merges `i18n.messages` now. Before, a partial override such as `{ cookieBanner: { title } }` replaced the whole `cookieBanner` section and left its other keys empty.

`@c15t/core` now exports `offline()`, a mode for `createConsentRuntime()` that resolves policy rules locally. A language set through the kernel, with `overrides.language` or `kernel.set.language()`, switches the copy when the bundle or `i18n.messages` has that language. A language with no copy falls back to the default copy, labelled with its own language. The language a server prefetch detected from `Accept-Language` does not switch the copy. `@c15t/browser` uses this transport, so `data-language`, the `overrides.language` option and `setLanguage()` now switch the copy in offline mode. The React and Svelte `offline()` modes are unchanged. The JavaScript, Vue and Solid boilerplate from `@c15t/cli generate` now uses core's `offline()`, and the generated offline kernel config passes `translationsFor`, so generated projects switch copy too.

`createOfflineTransport()` accepts `translationsFor` and `detectedLanguage` options with the same behavior. Without `translationsFor` it still relabels its copy with the requested language, as before.

`@c15t/core` also adds a `translationOverrides` kernel option, the `applyTranslationOverrides()` and `resolveLocalTranslations()` helpers, and an optional `translationsFor` on the transport factory context.
