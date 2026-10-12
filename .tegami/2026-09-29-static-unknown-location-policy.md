---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
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

### Resolve unknown locations on static pages with the manifest's own policy

`createStaticConsentResolver` from `@c15t/tanstack-start/static` starts a
visitor with no known location on the manifest's `fallback` pack, else its
`default` pack, as `@c15t/nextjs/static` does. It used to apply the strictest
pack in the manifest to everyone. With neither pack, it returns an
`insufficient-inputs` failure and the client applies its safe fallback. Geo
values that aren't non-empty strings count as an unknown location.

The resolver moved to `@c15t/core/static` (also `c15t/static`), and both
framework `static` entries re-export it. `resolveStrictestDefaultInit` is
renamed `resolveUnknownLocationInit`. The old name still works from the
framework entries but is deprecated.
