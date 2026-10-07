# Showcase: multilingual and multi-region

Northwind Coffee sells in English, German and French, to visitors in Europe,
the US and beyond. The consent banner follows both. Its language follows the
route (`/en`, `/de`, `/fr`), and the policy follows the visitor's region: an
opt-in banner in Germany, opt-out with no banner in California, and no consent
UI in Brazil under c15t's default rules.

The bar above the header previews the site as a visitor from each region. It
gives c15t a location the way a backend would from the request, and c15t
resolves its policy rules for it in the browser.

## The files that matter

- [`components/consent.tsx`](./components/consent.tsx) sets up `ConsentRoot`
  with the route's locale, the copy for each language and offline mode. A
  small `FollowLocale` component calls `useSetLanguage` when the route's
  locale changes.
- [`lib/consent-i18n.ts`](./lib/consent-i18n.ts) imports c15t's built-in
  German and French from `@c15t/translations/de` and `@c15t/translations/fr`,
  and rewrites one line per language in Northwind's voice. Everything else in
  the banner and dialog is c15t's own copy.
- [`components/visitor-preview.tsx`](./components/visitor-preview.tsx) sets
  the visitor's country and region with `useSetOverrides`, then runs `useInit`
  so c15t resolves the policy again.

The rest is the shop: `proxy.ts` sends `/` to the browser's language,
`lib/dictionaries.ts` holds the page copy, and `app/[lang]` renders it.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-multilingual dev
```

Open http://localhost:3116. It needs no account: offline mode resolves
c15t's recommended policy rules in the browser and keeps choices in this
browser.

## Going to production

In `components/consent.tsx`, replace `offline()` with
`hosted({ url: 'https://your-project.inth.app' })`. The backend reads the
visitor's location from the request and returns the policy for it, so the
preview bar can go. Its copy for the visitor's language, including edits made
in your project, becomes the base, and the messages in `lib/consent-i18n.ts`
override it key by key.

## Docs

- [Copy and translations](https://c15t.com/docs/customization/translations)
- [Next.js translations](https://c15t.com/docs/frameworks/next/translations)
- [Policies](https://c15t.com/docs/concepts/policies)
- [Geography headers](https://c15t.com/docs/frameworks/next/geography-headers)
