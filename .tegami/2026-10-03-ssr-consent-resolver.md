---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### One server-side consent resolver for every adapter

Every adapter's server render (`resolveConsent` in Next.js, TanStack Start
and SvelteKit, SvelteKit `loadConsent` and `c15tHandle`, the Astro middleware
and the Nuxt plugin) resolves consent through `resolveRequestConsent` from
`@c15t/core/server`. Behavior that had drifted between adapters is now the
same everywhere:

- A hosted `/init` request sends the resolved location, language, GPC signal
  and `user-agent`, the consent cookie (over `https` or to loopback only) and
  the headers you name in `forwardHeaders`. The visitor IP goes as
  `x-forwarded-for` only with `trustForwardedHeaders`. Next.js and SvelteKit
  used to send every cookie and copy the client's `x-forwarded-for`.
  `forwardHeaders` cannot name `cookie` or a `forwarded`/`x-forwarded-*`
  header.
- A server render never fetches the app's own consent routes over the
  network. In Next.js, if `config.backendURL` is the `/api/c15t` rewrite
  prefix, pass the upstream URL as `resolveConsent`'s `backendURL` too.
- GPC is read from `x-c15t-gpc`, then `sec-gpc`. A missing signal stays
  `undefined`. SvelteKit used to set `false`.
- `timeoutMs` defaults to 500 ms everywhere, including
  `@c15t/svelte/server`'s `resolveConsent`, which had no default. `false` or
  `Infinity` waits for the upstream.
- Prerendered and cached renders read no visitor data. TanStack Start and
  SvelteKit's `c15tHandle` and `loadConsent` accept `shared`. In SvelteKit,
  pass the `building` flag.

**Breaking.**

- `@c15t/nextjs/server` drops `DEFAULT_FORWARD_HEADERS`. List the extra
  request headers you want in `forwardHeaders`. `onError` receives an error
  naming the URL, with the original failure as `cause`.
- `@c15t/astro/api` drops `loadConsentManifest`, `resolveManifestInit`,
  `resolveSessionReportURL`, `ResolvedInitOutput` and `SessionReportTarget`.
  The consent cookie is no longer sent over plain HTTP to a same-origin host
  that is not loopback.
- `@c15t/vue/runtime/manifest` drops `C15T_TIMEOUT_HEADER`,
  `DEFAULT_NUXT_RESOLVE_TIMEOUT_MS` and `resolveNuxtTimeoutMs`. Use
  `CONSENT_ROUTE_TIMEOUT_HEADER` from `@c15t/core/server`. The Nuxt plugin
  keeps its state in `useState('c15t:consent')` instead of a `useFetch`
  result under `c15t:init`. On `ssr: false` routes the app mounts without
  waiting for `/init`.
- In `@c15t/svelte/kit`, `loadConsent`'s `fetch` is used only for a backend on
  another origin. Same-origin URLs always go through `event.fetch`.
