---
'@c15t/react-native': minor
---

Add `@c15t/react-native`, the React Native consent SDK backed by native Swift and Kotlin consent cores. Consent state lives natively, so it hydrates from protected storage and answers gating checks before the JavaScript bundle runs, and it survives restarts and offline runs through a persisted save queue. Includes the provider and hooks, headless components for custom UI, and the protocol for the native bridge.

Gating answers three states instead of a boolean. `useConsentDecision` on the JavaScript side, and `decision` plus the decision-carrying `gate` on Swift and Kotlin, report `granted`, `denied`, or `pending`, so an SDK that starts before the policy resolves waits instead of either initializing on an unknown or switching off a category the subject was about to grant. IAB TCF is not part of this first release.
