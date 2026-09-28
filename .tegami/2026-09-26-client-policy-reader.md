---
packages:
  "@c15t/schema": patch
  "@c15t/core": patch
  "@c15t/react": patch
---

### Keep policy pack resolution out of client bundles

The React provider and the core runtime resolved their disabled-mode policy with `resolvePolicyRules` when they loaded, so every page validated a rule and computed three SHA-256 fingerprints on startup, and every client bundle carried the policy validator and the hashing code. The kernel's policy wire reader also shared a module with `resolvePolicyRules`, which pulled in the same code. The disabled resolution is now a constant, pinned by a test to what the resolver returns, and `@c15t/schema/types` exports the wire reader and resolved-rule checks from their own modules. In a Next.js 16 production build of the App Router setup, first-load JavaScript drops by 17,665 bytes (5,313 bytes gzip). Every public export keeps its name and behavior.
