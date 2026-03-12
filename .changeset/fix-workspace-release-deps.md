---
"c15t": patch
"@c15t/backend": patch
"@c15t/cli": patch
"@c15t/dev-tools": patch
"@c15t/nextjs": patch
"@c15t/node-sdk": patch
"@c15t/react": patch
"@c15t/translations": patch
---

Republish patch release to fix workspace dependency protocol resolution during publish.

Published package manifests now resolve `workspace:*` references to concrete semver ranges before release.
