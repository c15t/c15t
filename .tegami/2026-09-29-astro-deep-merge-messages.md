---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Deep-merge `i18n.messages` in Astro

`i18n.messages` merges each translation group key by key, as the other
adapters do. Overriding `common.acceptAll` alone used to replace the whole
`common` group and blank the other button labels.
