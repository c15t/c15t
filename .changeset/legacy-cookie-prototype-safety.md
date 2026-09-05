---
'c15t': patch
---

Harden legacy compact cookie parsing against prototype pollution. `unflattenObject` now drops any `__proto__` path segment and only descends into own plain objects when rebuilding nested keys, so a crafted `c15t` cookie such as `__proto__.polluted:1` can no longer assign properties onto `Object.prototype` while consent is read. Well-formed cookies decode exactly as before.
