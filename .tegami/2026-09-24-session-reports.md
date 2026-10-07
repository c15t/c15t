---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Session reports from manifest mode

Hosts that resolve init from a cached manifest never call `/init`, so the
backend couldn't count their visitors. Every server-side resolution (the
adapters' init routes and render-time prefetches) sends `POST /sessions` to
the backend, server to server. The report carries the manifest revision,
matched policy, country, region, language, GPC signal, user agent and the
visitor's IP, which the backend masks under its `ipAddress` settings. Cookies
are not sent, and the browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport`
option. Nothing is stored. Reports run through `onBackgroundRevalidate`, so a
host that already passes `after` or `waitUntil` needs no change. Next.js
`resolveConsent` gains `waitUntil`, and `createManifestTransport` gains a
`report` option. Set `reportSessions: false` on any adapter to send none.
