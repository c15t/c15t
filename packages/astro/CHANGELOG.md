## @c15t/astro@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Session reports from manifest mode

A host that resolves init from a cached manifest never calls `/init`, so the backend could not count the visitors it served. Every server-side resolution now sends `POST /sessions` to the backend after the fact, server-to-server and detached from the response: the Next.js, TanStack Start, SvelteKit, Nuxt and Astro init routes, and the Next.js, TanStack Start and Astro render-time prefetches. The report carries the manifest revision, the matched policy, the jurisdiction, country, region, language and GPC signal. The visitor's user agent travels as `User-Agent` and the visitor's single client address on a dedicated `X-C15T-Client-IP` header, which the backend masks and records under its `ipAddress` settings; the forwarding chain itself is not sent, and neither are cookies. The browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport` option. Reports are written to the request's wide event and handed to the sink; nothing is stored. The backend's own `/init` emits the same event, so one sink sees hosted and manifest traffic alike.

Reports are handed to the same `onBackgroundRevalidate` hook as a background manifest refresh, so a host that already passes `after` or a platform `waitUntil` needs no change. `resolveConsent` in `@c15t/nextjs/server` gains `waitUntil` for the App Router. Set `reportSessions: false` on any adapter to send none. `createManifestTransport` in `@c15t/core` gains a `report` option; `@c15t/schema` adds `consentSessionReportSchema` and `buildConsentSessionReport`.

### Remove dialog scheduling delays and preserve IAB actions

Remove first-open scheduling delays from React's aggregate dialog, widget, and compound components while preserving server rendering and hydration. Keep children mounted when an external runtime provides IAB context, so loading the bridge cannot reset local drafts.

Remove the extra Suspense delay from Astro's React IAB dialog island.

Queue external-runtime IAB actions until the runtime publishes its handle, and reject pending saves with AbortError when the borrowing provider unmounts. Correct the React and Next.js peer dependency ranges to require React and React DOM 18 or newer, matching the APIs already used by v3. Upgrade both React packages before using v3 on an older installation.

# @c15t/astro

## 3.0.0-alpha.1

### Minor Changes

- dd44a61: Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.

### Patch Changes

- Updated dependencies [dd44a61]
- Updated dependencies [46f45c4]
  - @c15t/core@3.0.0-alpha.1
  - @c15t/svelte@3.0.0-alpha.1
  - @c15t/ui@3.0.0-alpha.1
  - @c15t/iab@3.0.0-alpha.1

## 3.0.0-alpha.0

### Major Changes

- 4460e3e: This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

  Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

  Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

  Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

  Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

  Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.

### Patch Changes

- Updated dependencies [4460e3e]
  - @c15t/core@3.0.0-alpha.0
  - @c15t/iab@3.0.0-alpha.0
  - @c15t/react@3.0.0-alpha.0
  - @c15t/schema@3.0.0-alpha.0
  - @c15t/svelte@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0
  - @c15t/ui@3.0.0-alpha.0
  - @c15t/vue@3.0.0-alpha.0
