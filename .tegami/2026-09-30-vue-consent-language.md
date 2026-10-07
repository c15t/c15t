---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Load new copy when the Vue consent language changes

Assigning a new language to `useConsentLanguage()` runs init again, so the
banner and dialog switch language without a `commands.init()` call. The Nuxt
`ConsentRoot` takes the same `language` prop as the Vue one.

A `country`, `language` or `region` prop on `ConsentRoot` no longer runs an
extra init on every page load or during server rendering. Changing a prop after
load still runs init once.
