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

## Configuration

`astro.config.mjs` uses `offline()`, so the demo needs no backend. Swap in
`hosted({ url })` to talk to a c15t backend, or `manifest({ backendURL })`
to serve `/init` from a cached manifest through the routes the integration
injects.
