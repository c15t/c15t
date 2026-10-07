---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Label Astro legal links and show them in the preference dialog

A legal link with no `label` in `legalLinks` reads as the translated name for
its type, such as "Privacy Policy", instead of the raw key `privacyPolicy`, as
in the React, Vue and Svelte banners.

`<ConsentDialog />` takes the same `legalLinks` prop as `<ConsentBanner>`.
Before, the Astro preference dialog never showed legal links.

```astro
<ConsentDialog legalLinks={['privacyPolicy', 'cookiePolicy']} />
```
