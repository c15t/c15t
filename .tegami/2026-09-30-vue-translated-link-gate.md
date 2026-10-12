---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Translate the Vue preferences link and match the React gate placeholder

`ConsentPreferencesLink` defaults to the `consentManagerDialog.title`
translation instead of "Privacy settings".

The `ConsentGate` placeholder matches React and Svelte. It shows
`consentGate.title` with the category name and a `consentGate.actionButton`
button that opens the preference center, which also lists the gate's category.
Under a strict policy that leaves the category out, it shows
`consentGate.policyBlocked` and no button. Slot content, including the
`placeholder` slot, still replaces the defaults.
