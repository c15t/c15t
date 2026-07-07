---
'@c15t/scripts': patch
---

Fix Mixpanel integration: implement the official snippet contract (`__SV` version marker and `_i` init registry) so `mixpanel-2-latest.min.js` initializes from the stub instead of logging "Mixpanel error: Version mismatch" and silently dropping queued events.
