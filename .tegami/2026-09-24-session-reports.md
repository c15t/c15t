---
packages:
  "@c15t/schema": minor
  "@c15t/core": minor
  "@c15t/backend": minor
  "@c15t/nextjs": minor
  "@c15t/tanstack-start": minor
  "@c15t/svelte": minor
  "@c15t/vue": minor
  "@c15t/astro": minor
---

### Session reports from manifest mode

A host that resolves init from a cached manifest never calls `/init`, so the backend could not count the visitors it served. Every server-side resolution now sends `POST /sessions` to the backend after the fact, server-to-server and detached from the response: the Next.js, TanStack Start, SvelteKit, Nuxt and Astro init routes, and the Next.js, TanStack Start and Astro render-time prefetches. The report carries the manifest revision, the matched policy, the jurisdiction, country, region, language and GPC signal, and forwards the visitor's IP chain and user agent as request headers. The browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport` option. Reports are written to the request's wide event and handed to the sink; nothing is stored. The backend's own `/init` emits the same event, so one sink sees hosted and manifest traffic alike.

Reports are handed to the same `onBackgroundRevalidate` hook as a background manifest refresh, so a host that already passes `after` or a platform `waitUntil` needs no change. `resolveConsent` in `@c15t/nextjs/server` gains `waitUntil` for the App Router. Set `reportSessions: false` on any adapter to send none. `createManifestTransport` in `@c15t/core` gains a `report` option; `@c15t/schema` adds `consentSessionReportSchema` and `buildConsentSessionReport`.
