---
"@c15t/backend": patch
"@c15t/vue": patch
"c15t": patch
---

Fix v3 manifest-mode saves and edge caching.

**`@c15t/backend`** — manifest recompute-on-write wrote the runtime policy pack
id (e.g. `europe_opt_in`) into `consent.policyId`, which is a foreign key into
`consentPolicy`. Every manifest-mode `POST /subjects` failed on an
FK-enforcing database such as Postgres; SQLite hid it because `PRAGMA
foreign_keys` defaults to off. The consent row is now anchored to a real
`consentPolicy` record via `findOrCreatePolicy`, and pack identity plus
fingerprint stay on `runtimePolicyDecision` where they belong.

**`c15t`** — the manifest transport no longer asserts partial decision inputs
when the manifest resolved no policy pack. Sending `country`/`language`
without `policyId`/`fingerprint` was rejected by the backend as incomplete
(`422 STALE_POLICY`).

**`@c15t/vue`**

- The Nuxt manifest route forwards the backend's `Cache-Control` and `ETag`
  verbatim instead of Nitro's `max-age=1` and `Vary: Accept-Language`, so the
  geo-independent manifest is genuinely CDN-cacheable. `Vary` is no longer
  forwarded at all — the response body depends only on the request URL.
- Backends that serve `/manifest` without a shared-cache TTL are now deduped
  in-process for a short floor, replacing the dedupe the cached-event-handler
  wrapper used to provide.
- A relative `backendURL` (e.g. `/api/self-host` when `@c15t/backend` is
  mounted in the same Nitro app) is routed through Nitro's in-process
  `localFetch`, since `globalThis.fetch` rejects relative URLs in Node.
  Absolute URLs are unaffected.
- The branding tag resolves its `?ref=` link after mount, fixing an SSR/client
  hydration mismatch.
