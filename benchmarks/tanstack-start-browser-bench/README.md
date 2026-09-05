# TanStack Start Browser Bench

Playwright benchmark app for `@c15t/tanstack-start`, built to run head to head
against `benchmarks/nextjs-browser-bench`: same fixture data, same scenario
names, same DOM hooks, same metric list, same Chromium build. The only extra
arm is `manifest-ssr-proxy`, which prices the opt-in same-origin proxy.

## Scenarios

| Scenario | Route | What it measures |
| --- | --- | --- |
| `baseline` | `/baseline` | Page floor: identical shell, no consent code. |
| `client` | `/client` | `ConsentProvider` with `hosted({ url: '/api/bench-consent' })`, `ssr: false`, so the provider mounts and runs init in the browser. |
| `manifest-client` | `/manifest-client` | `custom(createManifestTransport(...))` reading the same-origin `/api/c15t/manifest` route, `ssr: false`. |
| `ssr` | `/ssr` | Loader fetches `/api/bench-consent/init` server-side on every request and folds it in with `mergeInitIntoConsentConfig`; `ConsentBoundary` with `initRoute={false}`. Direct-init semantics, matching the Next `ssr` arm. |
| `manifest-ssr` | `/manifest-ssr` | Loader runs `createConsentConfigHandler({ backendURL, manifestURL })` through the in-process manifest cache; `ConsentBoundary` with the default same-origin init route. Saves post to the fixture directly. |
| `manifest-ssr-proxy` | `/manifest-ssr-proxy` | Same prefetch, but `ConsentBoundary backendURL="/api/c15t-proxy"`, a second `createConsentServerRoute({ proxy: true })` mount, so the accept click's `POST /subjects` takes one hop through the Start server. Start only. |
| `repeat-visitor` | derived | After each measured `client` iteration a second browser context loads `/client` and the runner measures the Open Preferences click, exactly as the Next runner does. Note that neither runner preseeds the consent cookie for this arm. |

There is no `rsc-ssr` arm: TanStack Start has no server components, so the
Next `rsc-ssr` scenario has no equivalent and is reported as Next-only.

Fixture routes live under `src/routes/api/bench-consent/` and are a copy of
the Next arm's `fixture.ts` (policy id, fingerprint, revision, and
translations are byte-identical, so both arms resolve the same policy). They
honour `C15T_BENCH_INIT_LATENCY_MS` and the `?cold=` token the same way.

## Running

```bash
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --iterations 15 --warmup 2
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --profile mobile --init-latency-ms 200
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --scenario manifest-ssr-proxy
bun run --cwd benchmarks/tanstack-start-browser-bench bench -- --cold-manifest true
```

The runner builds `dist/` with `vite build` when `dist/server/server.js` is
missing, then serves it on `127.0.0.1:4314` through `scripts/serve.mjs`.
`vite build` emits the server as a bare `{ fetch }` handler with no listener,
so `node dist/server/server.js` alone exits immediately; `serve.mjs` hosts it
with srvx's `node:http` adapter and serves `dist/client` as static files, which
is the Node hosting shape TanStack Start documents for that output. Results
land in `.benchmarks/current/browser-runtime/tanstack-start/`.

For the head-to-head report run both arms, then:

```bash
bun run bench:frameworks
```

which writes `.benchmarks/compare/frameworks.md` and `frameworks.json`.

## What is and is not equivalent

- **Server runtime.** Next runs `next start` (its own Node server). Start runs
  the Vite build's fetch handler behind srvx on `node:http`. Both are Node
  servers, but TTFB includes different framework routing layers.
- **`client` shell.** Next server-renders the page shell of its client
  component and only the consent state is client-side. Start's `ssr: false`
  renders the whole route in the browser, so its first HTML carries no `<main>`.
  The banner path is client-only in both.
- **`ssr` on the server.** Both arms call `/api/bench-consent/init` on every
  request. Start uses a hand-written loader for this because the package
  helper always goes through the manifest cache; see `src/bench/loaders.ts`.
- **`manifest-ssr` on the server.** Next's `prefetchInitialConsent` fetches
  its own `/api/c15t/manifest` route over HTTP each request and the route
  answers from the in-process cache. Start's prefetch refuses self-fetches and
  reads the same cache directly. That saved hop is a real adapter difference,
  not a harness artefact.
- **`manifest-ssr` saves.** The Next arm's boundary has no `backendURL`, so
  it runs in offline mode and the accept click never posts. The Start arm is
  in hosted mode and posts to the fixture. Compare the Next number against
  Start's `interactionLatencyMs` with that in mind, and use `manifest-ssr`
  versus `manifest-ssr-proxy` within Start to price the proxy hop.
- **`initRequestsAfterLoad` on SSR arms.** The React provider dispatches init
  eagerly on the client whenever the transport is hosted, even with an
  authoritative prefetch, so every hosted SSR arm shows one browser init
  request in both frameworks. Only Next's offline-mode `manifest-ssr` and
  `rsc-ssr` arms show zero. The `count-eq 0` budget copied from the Next
  runner therefore fails on the hosted arms of both frameworks.
- **Cache warmth.** Manifest arms warm the server cache during warmup
  iterations; the first cold fill is only visible with `--cold-manifest true`.

