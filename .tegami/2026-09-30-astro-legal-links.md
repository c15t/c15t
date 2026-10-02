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

A legal link with no `label` in `legalLinks` now reads as the translated name for its type, such as "Privacy Policy" or "Datenschutzerklärung", instead of the raw key `privacyPolicy`. The React, Vue and Svelte banners already did this.

`<ConsentDialog />` takes a `legalLinks` prop with the same list `<ConsentBanner legalLinks>` takes, and passes it to the Svelte, React or Vue dialog island. Before, the Astro preference dialog never showed legal links.

```astro
<ConsentDialog legalLinks={['privacyPolicy', 'cookiePolicy']} />
```
