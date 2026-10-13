---
packages:
  "@c15t/nextjs": minor
  "@c15t/react": minor
  "@c15t/tanstack-start": minor
  c15t: minor
---

### Add `useConsentGate` for custom consent gates

`useConsentGate(category)` returns what a gate on one consent category should
render: `'granted'`, `'pending'`, `'denied'` or `'policy-blocked'`. It also
returns the translated title, button label and policy message, and
`requestConsent`, which opens the preference center. Import it from
`c15t/react/headless`, `c15t/next/headless` or
`c15t/tanstack-start/headless`.

`ConsentGate` now runs on the hook, so a custom gate follows the same rules.
Granted content waits for hydration, a strict policy scope blocks categories
outside it, and server rendering never reads the clock. `ConsentGate` renders
the same markup as before.
