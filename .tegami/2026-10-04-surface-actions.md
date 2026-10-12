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

React, Vue, Nuxt, Svelte, Astro and `@c15t/browser` share one rule for which
surface shows after accept, reject or save.

- After a choice, the banner stays only while the policy still owes a choice or
  notice. In Vue, Nuxt and `@c15t/browser`, a save made while the policy is
  loading or after it failed no longer brings the banner back.
- In React and Svelte, a reopened banner closes once the new choice is recorded.
- On Astro under an IAB policy, `acceptAll()`, `rejectAll()` and the banner
  buttons go through the IAB CMP, so the TC string records the choice.
  `acceptAll()`, `rejectAll()` and `save()` also close an open banner or dialog.

Custom UI can import the rules from `c15t/surface-actions`
(`@c15t/core/surface-actions`), which exports `hasConsentUI()`,
`hasConsentPreferences()`, `showConsentSurface()`, `saveConsentSurface()`,
`saveIABConsentSurface()` and `saveConsentBlanket()`.
