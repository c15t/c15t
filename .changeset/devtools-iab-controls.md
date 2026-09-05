---
'@c15t/core': minor
'@c15t/dev-tools': minor
'@c15t/iab': patch
---

Restore IAB editing in DevTools through the provider's existing IAB module.
Search and edit registered and custom vendors, purposes, legitimate interests,
and special-feature opt-ins. Paginate long lists, generate and copy TC strings,
and report pending, successful, and failed saves.

Include custom vendors in IAB bulk accept/reject actions and report failed IAB
save requests instead of silently resolving. Expose kernel-scoped IAB controls
for inspection tools without creating another CMP instance.

Separate script loading eligibility from actual consent in script diagnostics.
Show save and refresh feedback next to DevTools controls and prevent duplicate
requests while an action is pending.
