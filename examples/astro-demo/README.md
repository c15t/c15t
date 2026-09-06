# @c15t/astro demo

A server-rendered Astro site wired to `@c15t/astro`. It exercises the parts
that are hard to see in isolation: a banner rendered without any framework
JavaScript, a preference centre that only downloads when someone opens it,
consent-gated scripts, geo overrides, and a runtime that survives
ClientRouter navigation.

## Run it

```bash
bun install
bun turbo run build --filter=@c15t/astro
bun run --cwd examples/astro-demo dev
```

Then open http://localhost:4321.

## What to look at

- **Home** — what the server decided for this request, a live consent
  readout driven by a plain `<script>`, and an inline script gated by
  `data-c15t-category`.
- **Second page** — navigate back and forth with the ClientRouter on. The
  runtime is a page singleton: consent state stays put, the banner does not
  reappear, nothing re-initialises over the network.
- **Geo overrides** — send `x-c15t-country`, `x-c15t-region`, `sec-gpc` or
  `accept-language` and watch the server-side decision change:

  ```bash
  curl -H 'x-c15t-country: DE' http://localhost:4321/geo
  curl -H 'x-c15t-country: US' -H 'x-c15t-region: CA' http://localhost:4321/geo
  curl -H 'sec-gpc: 1' http://localhost:4321/geo
  curl -H 'accept-language: de-DE,de;q=0.9' http://localhost:4321/
  ```

## Switching the dialog framework

`ui` picks which framework renders the on-demand dialogs. Real sites hardcode
one; the demo reads `C15T_UI` so the three builds can be compared:

```bash
C15T_UI=react bun run --cwd examples/astro-demo build
C15T_UI=vue   bun run --cwd examples/astro-demo dev
```

Only the selected framework's Astro integration is registered, so a build
contains exactly one framework runtime — the Svelte chunk is absent from the
React and Vue builds and vice versa. `vite.build.manifest` is on so the
dialog chunk graph can be walked from `dist/client/.vite/manifest.json`.

## Configuration

`astro.config.mjs` uses `offline()`, so the demo needs no backend. Swap in
`hosted({ url })` to talk to a c15t backend, or `manifest({ backendURL })`
to serve `/init` from a cached manifest through the routes the integration
injects.

## IAB TCF

`C15T_IAB=1` resolves a TCF policy instead of the opt-in one, so the layout
renders the IAB banner and preference centre:

```bash
C15T_IAB=1 bun run --cwd examples/astro-demo dev
# then open /iab
```

The banner is server-rendered with no framework JavaScript — the purposes
it names, the "+N more" count and the partner count all come from
`resolveIABBannerSummary` in `@c15t/iab/headless`, the same model the
React, Svelte and Vue banners read. "Customize" opens the preference
centre; the "N partners" link opens it on the vendors tab.

One request resolves one policy, so the whole demo switches together —
that is why the flag exists rather than a per-page toggle.

`demo-gvl.mjs` holds a two-vendor Global Vendor List. A real site never
ships one: hosted and manifest mode fetch it through `/init`, and an
offline site points `iab.gvlURL` at where the real list lives, which goes
through the in-process cache in `@c15t/core/server`.
