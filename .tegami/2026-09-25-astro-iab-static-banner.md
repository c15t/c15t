---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Show the Astro IAB banner on prerendered hosted and manifest pages

`IABConsentBanner` rendered nothing on prerendered pages in `hosted()` or
`manifest()` mode, or when the server had no vendor list yet. It leaves a
placeholder, and the browser renders the banner there once the policy and vendor
list arrive. Under an IAB policy the browser picks it over a `ConsentBanner`
placeholder on the same page.
