---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Translate the Vue preferences link and consent gate placeholder

`ConsentPreferencesLink` now defaults to the `consentManagerDialog.title` translation instead of the fixed text "Privacy settings", and the `ConsentGate` placeholder defaults to `frame.title` with the category name, as the React and Svelte gates do, instead of "Content requires permission.". Both use the visitor's language once init has delivered copy, and English until then. Slot content still replaces either default.
