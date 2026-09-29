---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Translate the Vue preferences link and match the consent gate placeholder to React

`ConsentPreferencesLink` now defaults to the `consentManagerDialog.title` translation instead of the fixed text "Privacy settings".

The `ConsentGate` placeholder was the fixed text "Content requires permission.". It now renders the same frame placeholder as the React and Svelte gates: the `frame.title` text with the category name and a button labelled with `frame.actionButton` that opens the preference center. The gate also adds its category to the categories the preference center lists. Under a strict policy that leaves the category out, the placeholder shows `frame.policyBlocked` and no button.

Both components use the visitor's language once init has delivered copy, and English until then. Slot content, including the gate's `placeholder` slot, still replaces the defaults.
