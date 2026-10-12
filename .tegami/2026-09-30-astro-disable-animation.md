---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Add `disableAnimation` to Astro

The integration accepts `disableAnimation`, which skips the banner's entry
animation and the dialog islands' enter and exit animations.
`<ConsentBanner />`, `<IABConsentBanner />`, `<ConsentDialog />` and
`<IABConsentDialog />` take the same prop to override it per surface.

```astro
<ConsentBanner disableAnimation />
```
