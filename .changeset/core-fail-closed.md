---
'@c15t/core': patch
---

Keep v3 consent initialization closed when the backend or manifest transport fails: withhold provisional consent UI, retry init with visibility-aware backoff, and replay failed consent saves after recovery for up to seven days or ten attempts.
