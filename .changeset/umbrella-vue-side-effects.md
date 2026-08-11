---
"c15t": patch
---

Derive the umbrella's `sideEffects` from the mirrored packages' own declarations. `@c15t/vue` declares no `sideEffects` field, so its shims (`shims/vue.*`, `shims/vue/**`) are now carved out of the umbrella's side-effect-free claim — a bare `import 'c15t/vue/runtime/…'` can no longer be tree-shaken away where the matching `@c15t/vue` import survives.
