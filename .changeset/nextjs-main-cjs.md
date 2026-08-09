---
"@c15t/nextjs": patch
---

Point `main` at the CJS build (`./dist/index.cjs`) instead of the ESM `./dist/index.js`, matching `@c15t/core` and `@c15t/react`. Legacy resolvers that ignore `exports` and load the package through `main` with `require()` no longer get handed an ESM file.
