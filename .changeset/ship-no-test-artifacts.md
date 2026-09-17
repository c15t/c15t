---
"@c15t/ui": patch
"@c15t/scripts": patch
---

Stop publishing test sources inside the shipped tarballs. `@c15t/ui` listed `src/primitives` and negated test files only under `src/styles`, so `src/primitives/__tests__/primitives.test.ts` reached consumers, and `@c15t/scripts` listed `dist-types` with no negation at all, so `dist-types/__tests__/helpers.d.ts` reached them with it. Each package now excludes `__tests__` under every source directory it ships.
