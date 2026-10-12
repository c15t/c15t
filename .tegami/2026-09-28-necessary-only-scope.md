---
packages:
  "@c15t/react-native":
    replay:
      - exit-prerelease(npm:@c15t/react-native)
---

### Show only necessary when a site declares no categories

A site that declares no categories (through `consentCategories`, scripts,
network rules, vendors or discovered frames) offers only Strictly necessary
under a permissive policy, as in v2. The banner still appears when the policy
asks for a choice. Any save records an acknowledgement that keeps it dismissed
until the choice expires, the policy changes or a category is declared. Strict
and IAB TCF policies still offer their whole scope.

`hasConsented()` and the `after-consent` trigger treat the acknowledgement as a
decision. The Astro server and the React Native Swift and Kotlin cores follow
the same rule. In React Native, a declared list also narrows what Accept all and
Reject all confirm.
