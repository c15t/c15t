---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Astro server renders no longer wait on a slow consent backend

The Astro middleware waits at most 500 ms for the backend before the page
renders. Before, a backend that never answered held every server-rendered page
open. When the budget runs out, the page renders without a banner in the HTML,
optional categories stay denied and gated scripts and iframes stay blocked. The
browser then resolves the policy and shows the banner.

Set the budget with `middleware: { timeoutMs }` in the integration options, or
`timeoutMs` when calling `resolveConsentContext` yourself. `timeoutMs: false`
waits as before. `DEFAULT_RESOLVE_TIMEOUT_MS` is exported from
`@c15t/astro/server`.

If your backend takes over 500 ms to answer `/init`, the banner appears after
the page loads. Raise `middleware.timeoutMs`, or set it to `false`.
