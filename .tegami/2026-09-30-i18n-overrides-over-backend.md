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

In hosted and manifest mode, translations from `/init`, a server prefetch or a
manifest replaced the app's `i18n.messages` for the same language. The backend
copy is now the base, and the app's `i18n.messages` for that language are
deep-merged over it. This applies to React, Next.js, TanStack Start, Svelte and
SvelteKit, Astro and `@c15t/browser`.

An app key wins only when it differs from c15t's built-in copy, so an app that
passes stock bundles such as `{ ...baseTranslations.de }` still shows backend
edits. Built-in copy is known for English, and for every bundled language once
`@c15t/translations/all` has loaded. Without it, every app key counts as a
customization. A regional language such as `de-AT` uses the `de` overrides when
there is no `de-AT` entry.

Astro deep-merges `i18n.messages` too, so a partial override such as `{
cookieBanner: { title } }` no longer empties the rest of the section.

`@c15t/core` exports `offline()`, a mode for `createConsentRuntime()` that
resolves policy rules locally and switches the copy when `overrides.language` or
`kernel.set.language()` sets a language. `@c15t/browser` uses it, so
`data-language`, `overrides.language` and `setLanguage()` switch the copy in
offline mode. The JavaScript, Vue and Solid boilerplate from `@c15t/cli
generate` uses it too, and the CLI installs `@c15t/translations` for it.

New APIs:

- `getStockTranslations()` in `@c15t/translations`
- the `translationOverrides` kernel option and the `applyTranslationOverrides()`
  and `resolveLocalTranslations()` helpers in `@c15t/core`
- `translationsFor` and `detectedLanguage` options on
  `createOfflineTransport()`, and `translationsFor` on the transport factory
  context
