---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Rename offline mode to `local()` and warn that it keeps no consent records

`offline()` is now `local()` in every framework package, in `c15t` and in
`c15t/modes`. `offline()` still works and is marked deprecated. c15t v4 removes
it.

In development builds, local mode logs one `console.warn` per page: c15t keeps
no server-side record of consent, and with no geolocation every visitor gets
the same policy. Production builds never log it, and it blocks nothing. Pass
`local({ acknowledgeNoRecords: true })` to hide it once you have decided a
browser-only record is enough. c15t v4 will require that option.

The script tag's local-mode file is now `c15t.local.js`. `c15t.offline.js`
still ships until v4, and on development hosts it logs its new name. Script-tag files are production builds, so
they log the warning only on development hosts such as `localhost`. Add
`data-acknowledge-no-records` to the tag to hide it. `c15t.local()` joins the
script-tag global.

`c15t setup` labels local mode "Development and tests only, no consent records"
and generates `local()`.
