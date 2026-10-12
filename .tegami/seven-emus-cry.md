---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Remove dialog scheduling delays and preserve IAB actions

React's dialog, widget and compound components open without a first-open delay,
and Astro's React IAB dialog island drops its extra Suspense delay. With an
external runtime providing IAB context, children stay mounted so local drafts
survive, IAB actions wait for the runtime, and pending saves reject with
`AbortError` if the provider unmounts.

`@c15t/react` and `@c15t/nextjs` require React and React DOM 18 or newer.
Upgrade both before using v3 on an older install.
