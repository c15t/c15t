# Next.js compatibility matrix

Real Next.js apps that build and smoke-test `@c15t/nextjs` in every combination we support. CI runs one job per cell (`.github/workflows/next-compat.yml`); a nightly job additionally runs the Next 16 cells against `next@canary` as an advisory check.

## Cells

| Workspace | Next | Router | Bundler | Scenarios |
| --- | --- | --- | --- | --- |
| `next-15-app` | 15 | App | webpack | client, ssr, isr, manifest, manifest-ssr |
| `next-16-app` | 16 | App | Turbopack | client, ssr, isr, manifest, manifest-ssr |
| `next-16-cache-components` | 16 | App, `cacheComponents: true` | Turbopack | client, ssr, cached, manifest, manifest-ssr |
| `next-15-pages` | 15 | Pages | webpack | client, ssr, manifest, manifest-ssr |
| `next-16-pages` | 16 | Pages | Turbopack | client, ssr, manifest, manifest-ssr |

Every cell pins an exact `next` version in its `package.json` and builds with that version's default bundler. Bump the pins when a new minor ships. Next 13 and 14 are out of the support range for 3.x and have no cell on purpose.

## What a scenario asserts

Each scenario is a route that mounts the same `ConsentShell` from `shared/` (a `ConsentBoundary` in hosted mode) and declares how the init data is expected to arrive:

- `client`: the browser runtime calls `/init` after hydration. Static, ISR, and `'use cache'` routes use this path.
- `ssr`: the server called `/init` through `prefetchInitialConsent` (App Router layout, or `getServerSideProps` through the helper's `request` adapter) and the resulting policy reached the first HTML.
- `manifest`: the browser runs `custom(createManifestTransport(...))` against the same-origin manifest route mounted from `@c15t/nextjs/api`, so the backend never sees `/init`; the route handler fetches the backend `/manifest` once and serves it from the Next.js Data Cache afterwards.
- `manifest-ssr`: the server calls `prefetchInitialConsent({ manifestURL })`, resolves init from the manifest route, and the policy reaches the first HTML without any `/init`.

For every scenario the suite (`shared/src/suite/index.ts`) checks:

1. `next build` rendered the route the way the docs promise: static, ISR with the declared revalidate, dynamic, or partial (a Cache Components route with a static shell and a postponed hole). Read from `.next/prerender-manifest.json`, the route `.meta` file, and for Pages Router pages without data fetching `.next/server/pages-manifest.json`.
2. The banner renders once the kernel holds an authoritative policy, and the location it reports matches the forwarded `x-vercel-ip-country` header.
3. Who called `/init` and `/manifest`. The backend stub records every request; browser requests carry `sec-fetch-site`, server requests do not. `ssr` needs a server `/init` call with `x-c15t-country`, `client` needs exactly one browser call and no server call, the manifest scenarios need zero `/init` calls, and `manifest` additionally needs the backend `/manifest` to be fetched once across two page loads (the caching claim).
4. The first HTML contains the banner only for the server-resolved scenarios.
5. Accepting consent persists across a reload.
6. No console errors or warnings and no page errors.

The backend stub lives in `shared/src/fixture` and is mounted at `/api/c15t` in each app. `GET /api/c15t/__compat/requests` lists what `/init` received; the suite clears it before each test.

## Running locally

```bash
bun install
bun turbo run test:compat --filter=@c15t/next-compat-16-app        # one cell, builds deps first
bun turbo run test:compat --filter='./internals/next-compat/*'    # every cell
bun run --cwd internals/next-compat/next-16-app test:compat       # skip turbo; builds the app if .next is missing
```

The global setup (`shared/src/suite/global-setup.ts`) runs the cell's `build` script when `.next/BUILD_ID` is absent, starts `next start` on a free port, and stops it afterwards. `COMPAT_FORCE_BUILD=1` rebuilds; `COMPAT_SKIP_BUILD=1` never builds; `COMPAT_PRINT_SERVER_LOGS=1` prints the server output at teardown.

Chromium is needed once: `bunx playwright@<root devDependency version> install chromium chromium-headless-shell`.

## Adding a cell

1. Copy the closest existing cell directory and rename the package to `@c15t/next-compat-<cell>`.
2. Pin `next` (and `react`, `react-dom` if they must differ) in its `package.json`, run `bun install`.
3. Adjust routes and the scenario table in `tests/compat.test.ts`.
4. Add the cell to the matrix in `.github/workflows/next-compat.yml` and to the table above.

Keep route files thin: everything shared belongs in `shared/` so a failing cell points at the framework combination, not at fixture drift.

## Recipes the fixtures encode

These are the patterns that have to hold for users, so the fixtures use them verbatim.

- `beforeInteractive` scripts are only honoured in a root layout (App Router) or as direct `next/script` children of `<Head>` or `<body>` in `_document` (Pages Router). Worth remembering if a pre-hydration script ever comes back.
- Import shared constants from a plain module, never from a `'use client'` module. A constant re-exported from a client module reaches a Server Component as a client reference, so `backendURL` silently becomes an object.
- `prefetchInitialConsent` reads request headers and cookies, so its route is dynamic. Static, ISR, and cached routes init in the browser, or use manifest mode.
- Under `cacheComponents: true`, awaiting `prefetchInitialConsent` directly in a layout is a build error (`blocking-prerender-dynamic`). The cell moves the await into an async child behind `<Suspense>`, which makes the route partial. `export const revalidate` is rejected there too, so the cached scenario uses `'use cache'` with `cacheLife('minutes')`.
- The manifest route handlers are App Router route handlers (Web `Request` in, `Response` out). The Pages cells bridge Node's `req`/`res` with the fixture's own adapter because the package ships none.
- In the browser, manifest mode has no geo input, so the store reports no country; the `manifest` scenario expects `null`. Server-side manifest resolution reads the forwarded headers and does report it.
- The Pages Router loads installed packages with Node at runtime. Two things follow. Bare `next/*` specifiers do not resolve there (Next ships no `exports` map), so the package imports `next/script.js` and friends. And the `@c15t/ui` component class maps import their CSS by design (a `js` + `css` + `d.ts` triple per component), which Node cannot load, so a Pages Router app must list `@c15t/nextjs`, `@c15t/react`, and `@c15t/ui` in `transpilePackages`. The Pages cells do; the requirement needs documenting, or a Node-conditional export without the CSS import.
- Pages Router SSR passes the `getServerSideProps` request to `prefetchInitialConsent` through its `request` adapter (`headers()` and `cookies()` callbacks) and hands the resolved config to `ConsentBoundary` as a prop. `next start` adds `x-forwarded-proto` on both Next 15 and 16, so a relative backend URL resolves.

## How the cells install the packages

Cells depend on `@c15t/nextjs` through the workspace so Turbo orders the package builds first, but they do not consume the workspace links. Each cell's `build` script first runs `shared/scripts/pack.ts`, which runs `bun pm pack` on the whole `@c15t/nextjs` dependency closure, extracts the tarballs as real directories under the cell's own `node_modules/@c15t/*`, links the packages' third-party dependencies beside them, and copies the shared fixture package in as well so its imports resolve from the same tree. Then `next build` runs.

That is the shape an npm install has, and it matters three times over: both bundlers decide "installed dependency or first-party code" by the real path (first-party code gets React Server Components checks in webpack and a global-CSS ban in the Pages Router under Turbopack), the Pages Router `require`s installed packages at runtime so their `next` peer must resolve to the cell's own copy, and the cells end up consuming exactly what `files` and `exports` publish.

`bun install` restores the workspace links; the next cell build replaces them again. The pack step also drops the cell's `.next/cache`: webpack's persistent cache treats `node_modules` as immutable unless a package version changes, so a re-packed package would otherwise be served stale. The suite's global setup runs the cell's `build` script when `.next/BUILD_ID` is missing, so a plain `vitest run` in a cell does the same.
