---
packages:
  '@c15t/ui': minor
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/svelte': minor
  '@c15t/astro': minor
  '@c15t/cli': patch
  c15t: minor
---

### Stop c15t's stylesheet holding back the first paint

The stylesheet apps imported for c15t was linked from `<head>`, and the
browser painted nothing until it downloaded. On a throttled phone, a Next.js
page with a banner first painted at about 650 ms instead of 370 ms. Now the
stock surfaces bring their own styles, and no c15t stylesheet request comes
before the first paint.

- **React, Next.js and TanStack Start.** `ConsentBanner`,
  `ConsentDialogTrigger`, `ConsentGate`, `ConsentDialog` and `ConsentWidget`
  render the c15t rules they use as `<style>` elements. A server-rendered
  banner puts them in the HTML. The dialog's rules ship with the dialog's
  code. React 19 moves them into `<head>` and renders each once; with the
  provider's `nonce`, or in React 18, they render next to the surface and
  carry the nonce.
  `IABConsentBanner` and `IABConsentDialog` deliver their IAB rules the same
  way, including the shared styles a standalone dialog needs.
- **Svelte and SvelteKit.** The surfaces add their rules to `<head>` in the
  browser. On a server-rendered SvelteKit page, `c15tHandle` writes the
  banner's rules into the HTML.
  IAB banners and dialogs also deliver their own styles.
- **Astro.** The integration no longer adds `c15t/astro/styles.css` to every
  page. `<ConsentScript />`, or the banner on a layout without it, inlines the
  first-paint rules, including IAB when configured, and Astro's CSP config gets their hash. The dialog's
  rules load when a dialog first opens. A site on Tailwind CSS 3 keeps the
  linked stylesheet, which its PostCSS build has to process.

Remove the `styles.css` import from your app. If you keep it, the page looks
the same, but the stylesheet still holds the first paint and its rules load
twice. To keep importing it, for Tailwind CSS 3 or a named cascade layer, set the new
`styles: false` option on the provider (`ConsentRoot`'s `options` in Next.js
and TanStack Start). A nonce-based `style-src` needs the provider's `nonce`,
or `styles: false`.

`@c15t/ui` adds `@c15t/ui/styles/sheets/first-paint`, `dialog` and
`primitives`, plus `iab-first-paint` and `iab-dialog`, which export those rules
as strings. `dialog.css` and `iab-dialog.css` are available in the same
directory for deferred loading. The aggregate stylesheets remain available.

The setup CLI omits aggregate CSS imports for adapters that deliver their own
styles. Tailwind CSS 3 setups keep manual imports and disable automatic styles.
