---
packages:
  '@c15t/astro': patch
---

### Show the Astro IAB banner on prerendered hosted and manifest pages

`IABConsentBanner` rendered nothing on a prerendered page in `hosted()` or
`manifest()` mode, or whenever the server had no vendor list yet. It now leaves
a placeholder, and the browser renders the IAB banner there with the same
markup as the server version once the policy and vendor list arrive. Under an
IAB policy the browser picks the IAB banner over a `ConsentBanner` placeholder
on the same page.
