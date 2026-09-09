---
'c15t': major
'@c15t/schema': major
'@c15t/react': major
'@c15t/nextjs': major
'@c15t/vue': major
'@c15t/svelte': major
'@c15t/astro': major
---

Bring back `model: 'none'`, default offline mode to the recommended policy
pack, and treat an unknown location as strict.

- `model: 'none'` means processing is permitted by default, there is no
  prompt, and no rights are owed. Optional categories in scope are granted,
  `necessary` as always, and out-of-scope categories follow `scopeMode`. No
  choice is recorded, no consent record is written, and no consent UI renders,
  not even the preference trigger. Add `rights: ['preferences']` to keep a
  settings link and dialog. GPC is honoured only when the rule configures
  `privacySignals.gpc.denyCategories`. Only `prompt: 'none'` is valid;
  `actions` and `preselectedCategories` are errors. `useModel()` returns
  `'none'` for it and `null` only when no rule has resolved. v2's `none`
  model maps to it directly.
- `offline()` with no `policyRules` resolves `recommendedPolicyRules()`
  instead of an unconfigured fallback. Passing your own rules replaces the
  pack. `unconfigured` now occurs only for transports that never provide
  rules.
- The recommended pack is, in order: `europeOptIn()` (or `europeIab()` with
  `{ iab: true }`), `quebecOptIn()`, `usPrivacyStatesOptOut()`, and the new
  `worldNone()` for every other known location. The Europe preset keeps its
  unknown-location fallback, so a visitor with no location sees the strict
  opt-in banner, and a bare `offline()` with no country does the same. A South
  Dakota visitor resolves to `worldNone()` and sees nothing.
  `worldOptOutNoPrompt()` remains available as an explicit alternative default.

Migration: if you relied on `worldOptOutNoPrompt()` as the last rule, decide
whether unmatched visitors should keep opt-out rights (keep it) or see nothing
(switch to `worldNone()`).
