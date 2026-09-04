---
'@c15t/core': minor
'@c15t/schema': minor
'@c15t/svelte': minor
---

Add `@c15t/svelte/kit`, a server-side layer for SvelteKit apps.

- `c15tHandle()` is a `Handle` for `hooks.server.ts`, composable with `sequence()`. It normalizes CDN geo, GPC and `Accept-Language` onto the request as the canonical `x-c15t-*` / `sec-gpc` headers, reads the stored consent cookie, and publishes the resulting `KernelConfig` on `event.locals.c15t` so nothing downstream re-parses headers. Reference the `App.Locals` shape as `C15tLocals`, or `/// <reference types="@c15t/svelte/kit/locals" />`.
- `createSvelteKitConsentRouteHandlers()` returns `RequestHandler`s for a same-origin init route and a manifest route — the SvelteKit half of RFC 0001 manifest mode. The init route resolves the policy locally from the cached tenant manifest and answers `private, no-store`; the manifest route forwards the backend's `Cache-Control` and `ETag` verbatim and answers `If-None-Match` with `304`, so the edge does the caching. Use `init` and `manifest` in separate route files, or the `GET` dispatcher from one `[...path]` catch-all.
- `loadConsent(event, options)` is the `+layout.server.ts` half. It returns the serializable `KernelConfig` to pass as the provider's `prefetch`, from `event.locals.c15t` when the handle ran and from the request itself when it did not, in manifest mode (`initRoute`) or hosted mode (`backendURL`). A failed upstream call degrades to the cookie-only config instead of taking the page down.

`ConsentBanner` and `IABConsentBanner` now server-render in their final visible state when a `prefetch` says the banner should show, so the shell is in the first HTML with no entry animation replayed on hydration. Client-triggered shows keep the animated path.

`@c15t/core` gains a `./server` entry with the manifest fetch, in-process dedupe cache and cache-header passthrough that host integrations were each hand-rolling, and `@c15t/schema/types` now exports `headersToRecord`.
