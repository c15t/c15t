---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
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

### Run the banner's entry transition from the stylesheet

Fingerprint keys no longer use `localeCompare`, whose first call set up the ICU
collator on the main thread before the banner could show. Fingerprints stay
byte-identical.

`@c15t/ui` carries the banner's entry transition as `@starting-style` states
with the `bannerEntering`, `overlayEntering`, `dialogEntering` and
`contentEntering` classes, and every framework renders the banner with them. The
transition runs from the first frame, the same way for server and client
renders, and Astro's prerendered banner fades in like the others. Browsers
without `@starting-style` show the banner in place, except with the script tag,
which keeps its old class flip for them.
