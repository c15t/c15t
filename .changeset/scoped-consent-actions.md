---
'@c15t/core': patch
'@c15t/react': patch
'@c15t/dev-tools': patch
'@c15t/svelte': patch
'@c15t/vue': patch
---

Limit accept and reject actions to displayed consent categories, preserving
choices outside that scope. Kernel bulk saves default to policy categories and
accept an explicit category scope for framework UIs. DevTools uses the same
displayed categories as its provider.
