---
packages:
  '@c15t/browser': patch
  '@c15t/core': patch
  '@c15t/dev-tools': patch
  '@c15t/vue': patch
---

### Match preference toggles to effective state under GPC and `none` policies

Preference switches now start off for any category denied by a restriction such
as Global Privacy Control when the visitor has no saved choice, overriding
opt-out defaults, preselected categories and presentation defaults. Saving
preferences without changing those switches now records a denial for those
categories instead of a grant. A visitor who already saved a grant for a
restricted category still sees that switch on, and Vue and `@c15t/browser` now
show the same restriction notice below the row as React and Svelte.

Preference drafts and DevTools now also show categories on by default under a
`none` policy, matching the evaluator. `@c15t/core` exports `policyDefault` for
that rule.
