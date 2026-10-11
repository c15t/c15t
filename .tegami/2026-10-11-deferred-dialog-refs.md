---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Keep refs on lazy-loaded dialog parts in React 18

A `ref` on a compound part of `ConsentDialog`, `ConsentWidget` or `IABConsentDialog`, such as `ConsentDialog.Card`, now reaches the element in React 18. The lazy-loaded wrapper dropped it, and React 18 logged a function-component ref warning.
