---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
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
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Every adapter closes consent surfaces the same way

Accept, reject and save now decide which surface shows next through one module in `@c15t/core`, so React, Vue, Nuxt, Svelte, Astro and `@c15t/browser` behave alike:

- After a choice, the banner shows only while the policy still owes a choice or a notice. A choice saved while the policy is still loading, or after it failed to resolve, no longer brings the banner back in Vue, Nuxt and `@c15t/browser`.
- A banner reopened for a visitor who already chose now closes once the new choice is recorded in React and Svelte, as it already did in `@c15t/browser`.
- On Astro, `acceptAll()`, `rejectAll()` and the banner's Accept and Reject buttons go through the IAB CMP under an IAB policy, so the TC string records the choice. Before, they saved categories only. `acceptAll()`, `rejectAll()` and `save()` now also close an open banner or dialog once the choice is recorded.

The rules are public at `c15t/surface-actions` (`@c15t/core/surface-actions`) for custom UI: `hasConsentUI()`, `hasConsentPreferences()`, `showConsentSurface()`, `saveConsentSurface()`, `saveIABConsentSurface()` and `saveConsentBlanket()`.
