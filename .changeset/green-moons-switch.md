---
'@c15t/backend': patch
'@c15t/cli': patch
'@c15t/dev-tools': patch
'@c15t/logger': patch
'@c15t/node-sdk': patch
'@c15t/react': patch
'@c15t/scripts': patch
---

Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

- `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
- `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
- Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.
