---
'@c15t/schema': patch
'@c15t/react': patch
---

Shrink the first-load bundle for offline mode and the consent trigger. `recommendedPolicyRules()` no longer pulls every policy preset into the bundle. In a Vite build of an app that uses `offline()`, this saves about 6.5 KB gzip, with or without `policyRules`. Turbopack already dropped the unused presets. `ConsentDialogTrigger` now loads its DevTools toolbar only when `<ConsentDevTools>` is mounted, which saves about 0.5 to 1 KB gzip for apps without DevTools. With DevTools mounted, the trigger still switches to the toolbar without waiting for a request.
