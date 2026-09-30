---
packages:
  '@c15t/astro': patch
  c15t: patch
---

### Add `disableAnimation` to Astro

The integration accepts `disableAnimation`. It skips the banner's entry animation, in the server markup and in a banner the browser renders, and the dialog islands' enter and exit animations. `<ConsentBanner />`, `<IABConsentBanner />`, `<ConsentDialog />` and `<IABConsentDialog />` take the same prop to override it for one surface.

```astro
<ConsentBanner disableAnimation />
```

Left unset, animations play, and the stylesheet stops them for visitors who ask for reduced motion, as before.
