---
'@c15t/core': major
'@c15t/iab': major
'@c15t/scripts': patch
---

Evaluate script, iframe and network gates from effective permissions at the time of use, including expired grants and standing GPC restrictions. Restore iframe sources after a fresh grant and update consent-aware scripts when individual permissions change.

Require confirmed, validated IAB TC authority for targets with IAB metadata. Draft vendor and purpose edits no longer grant access; call the IAB handle's `save()` to confirm them. Stored IAB receipts retain their original policy binding and expiry, and every referenced category restriction also applies to IAB targets.
