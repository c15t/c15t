---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Re-render Vue components only when their consent value changes

`useHasConsent()`, `useConsentInit()` and `useConsentPolicyActions()` returned a
new value on every kernel update, so components re-rendered on any change,
including opening the dialog. They keep their previous value while its contents
are unchanged. The stock banner, dialog and preference widget follow the same
rule.
