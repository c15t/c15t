---
'@c15t/astro': minor
---

Add `@c15t/astro`, an Astro integration for c15t.

Astro is an MPA and islands never share a component tree, so the kernel is a
page-level singleton created by a script the integration injects rather than a
provider. Everything on the page — islands, plain `<script>` tags, any
framework — reads that one runtime.

- `c15t(options)` registers a `pre`-order middleware, the page boot script,
  and (in `manifest` mode) `/api/c15t/init` and `/api/c15t/manifest` routes.
- The banner is a server-rendered `.astro` component with zero framework
  JavaScript, the same DOM and `data-testid`s as the Svelte and React banners,
  and no markup at all for a visitor who has already consented.
- The preference centre and IAB dialogs are Svelte islands mounted on first
  open with Svelte 5's `mount()`, behind a swappable adapter seam.
- Middleware reads the consent cookie plus geo and GPC headers through the
  shared `@c15t/schema` helpers and resolves the decision server-side, so the
  browser boots from an inlined config with no `/init` roundtrip per page.
- The runtime survives ClientRouter navigation and re-attaches on
  `astro:page-load` / `astro:after-swap`.
- `<script data-c15t-category="..." is:inline type="text/plain">` tags are
  gated alongside the scripts declared in configuration.

The runtime is `createConsentRuntime` from `@c15t/core/runtime` and the
injected routes use the shared manifest cache in `@c15t/core/server`, so the
Astro, SvelteKit, Next.js and Nuxt layers cannot drift on lifecycle or cache
semantics. The dialog island renders `<ConsentManagerProvider runtime={...}>`
against the page runtime rather than building a kernel of its own.
