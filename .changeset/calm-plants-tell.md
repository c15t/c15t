---
"c15t": minor
"@c15t/react": minor
---

feat(consent): add change-only consent callbacks

- add `onConsentChanged` as a dedicated callback for explicit consent saves that change an existing persisted consent state
- include both previous and current consent categories in the callback payload so analytics and integrations can diff grant/revoke transitions directly
- keep `onConsentSet` focused on broad consent-state updates, including initialization and auto-grant flows
- update the React provider to keep callback registrations in sync when callback props change after mount
