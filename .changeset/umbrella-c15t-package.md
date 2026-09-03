---
'c15t': major
'@c15t/core': major
'@c15t/react': major
'@c15t/nextjs': major
---

`c15t` is now the umbrella package for the whole platform, and the headless engine lives at `@c15t/core`.

- **`c15t` (major, repurposed)**: installing `c15t` now brings in `@c15t/core`, `@c15t/react`, and `@c15t/nextjs` (pinned to exact matching versions) and mirrors every one of their exports: import `c15t` for the headless engine, `c15t/react` for the React components, and `c15t/next` for the Next.js integration. Every subpath matches the scoped package one-to-one (`c15t/react/hooks` ≡ `@c15t/react/hooks`, `c15t/transports/manifest` ≡ `@c15t/core/transports/manifest`, `c15t/next` ≡ `@c15t/nextjs`), including CSS entrypoints and the `primitives/*` wildcards.
- **`@c15t/core` (major, new name)**: the headless consent engine previously published as `c15t` is now `@c15t/core`, with an unchanged API. Existing `c15t` engine imports keep working through the umbrella.
- **`@c15t/react` / `@c15t/nextjs` (major)**: `react` and `react-dom` are now optional peer dependencies of `@c15t/react`, and `next`, `react`, and `react-dom` are optional peers of `@c15t/nextjs`. The umbrella depends on both packages from any project type, so package managers must not force framework installs onto, say, a plain JavaScript app that only uses the headless engine. If you use the React or Next.js entrypoints you still need the matching framework installed — the supported version ranges are unchanged.

The scoped packages remain published and permanently supported; nothing about installing `@c15t/core`, `@c15t/react`, or `@c15t/nextjs` directly changes.
