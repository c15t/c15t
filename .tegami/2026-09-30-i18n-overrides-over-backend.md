---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
---

### Keep app `i18n.messages` overrides when the backend sends translations

In hosted and manifest mode, the translations from `/init`, from a server prefetch or from a manifest replaced the app's `i18n.messages` for the same language, so a key overridden in code showed the backend's copy instead. This affected React, Next.js and TanStack Start through the React provider, Svelte and SvelteKit (including `resolveConsent()` prefetches), Astro and `@c15t/browser`.

The backend copy is now the base for the visitor's language and the app's `i18n.messages` for that language are deep-merged over it. An app key replaces the backend's text when it differs from c15t's built-in copy for that language, or for its primary language. A key that repeats the built-in text does not hide the backend's copy, so an app that passes the stock bundles to enable languages, such as `{ ...baseTranslations.de }`, still shows edits made on the backend, while a customized key still wins. Keys the backend does not supply keep the app's copy, so a language the backend does not send still shows the app's copy in full. Overrides for other languages are not applied. A regional language such as `de-AT` uses the overrides under `de` when there is no `de-AT` entry.

Built-in copy is known for English and, once `@c15t/translations/all` has loaded, for every bundled language. Without it, every app key counts as a customization. `@c15t/translations` adds `getStockTranslations()` for this, and `/all` registers its languages when it loads. The package now lists `dist/all.js` under `sideEffects`, so a bare `import '@c15t/translations/all'` survives tree shaking.

Astro also deep-merges `i18n.messages` now. Before, a partial override such as `{ cookieBanner: { title } }` replaced the whole `cookieBanner` section and left its other keys empty. A regional `i18n.locale` or `Accept-Language` such as `de-AT` now renders over the `de` bundle instead of English.

`@c15t/core` now exports `offline()`, a mode for `createConsentRuntime()` that resolves policy rules locally. A language set through the kernel, with `overrides.language` or `kernel.set.language()`, switches the copy when c15t's built-in copy or `i18n.messages` has that language, falling back to the primary language, so `de-AT` uses German copy. Built-in copy covers English, and every bundled language once `@c15t/translations/all` has loaded. A language with no copy gets the startup copy back, still labelled with the startup language. The language a server prefetch detected from `Accept-Language` does not switch the copy until the app has asked for a different language. `@c15t/browser` uses this transport, so `data-language`, the `overrides.language` option and `setLanguage()` now switch the copy in offline mode. The Svelte `offline()` mode is unchanged. The JavaScript, Vue and Solid boilerplate from `@c15t/cli generate` now uses core's `offline()`, and the generated offline kernel config passes `translationsFor` with `baseTranslations` from `@c15t/translations/all`, so generated projects switch to any bundled language too. The CLI installs `@c15t/translations` for that config.

`createOfflineTransport()` accepts `translationsFor` and `detectedLanguage` options with the same behavior. Without `translationsFor` it still relabels its copy with the requested language, as before.

`@c15t/core` also adds a `translationOverrides` kernel option, the `applyTranslationOverrides()` and `resolveLocalTranslations()` helpers, and an optional `translationsFor` on the transport factory context.
