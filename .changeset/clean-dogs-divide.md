---
'@c15t/dev-tools': patch
'@c15t/react': patch
'@c15t/ui': patch
---

Replace the shared `clsx` dependency with a local `cn` implementation owned by `@c15t/ui`.

- `@c15t/ui`: own the public `ClassValue` type and `cn(...)` implementation directly instead of re-exporting them from `clsx`, with coverage for nested arrays, object maps, numeric values, and ordering.
- `@c15t/react`: continue consuming the shared `@c15t/ui` class helper while dropping the now-unused direct `clsx` dependency from the published package.
- `@c15t/dev-tools`: remove the unused direct `clsx` dependency from the published package manifest.
