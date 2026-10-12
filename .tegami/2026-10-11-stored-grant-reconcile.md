---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Keep the banner up after a tab switch when the server saw no cookie

With server-rendered consent, a grant left only in `localStorage`, for example
after a visitor deleted their cookies, was ignored on page load but applied the
next time the tab regained focus. The banner disappeared, gated scripts were
allowed to load, and the next reload brought the banner back.

Switching tabs now follows the same rule as the page load: stored grants the
server did not see stay ignored until storage changes. A choice saved in another
tab still applies as soon as this tab notices it.
