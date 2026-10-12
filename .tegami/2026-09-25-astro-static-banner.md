---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Show the Astro banner on prerendered pages

`ConsentBanner` rendered nothing on prerendered pages because the build had no
policy.

- In `offline()` mode the build renders the banner hidden, and the browser shows
  it to visitors who have not chosen yet.
- In `hosted()` and `manifest()` mode, `ConsentBanner` leaves a placeholder that
  the browser fills once init returns a policy that needs a banner. Returning
  visitors skip the renderer download.

A banner hidden after a choice no longer stays on screen. The CLI's Astro
boilerplate no longer tells you to avoid prerendering.
