---
packages:
  "@c15t/react": minor
  "@c15t/core": minor
  "c15t": minor
  "@c15t/nextjs": patch
  "@c15t/tanstack-start": patch
  "@c15t/svelte": patch
---

### React provider on the shared runtime

`@c15t/react`'s `ConsentProvider` now renders the runtime from
`createConsentProviderRuntime`, the same one the Svelte provider uses, instead
of its own copy. Its props, hooks and the `runtime` prop are unchanged.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` picks this up.

**Breaking.** `persistence` and `storageConfig` are read once, when the
provider mounts. A new storage key used to move the stored choice to the new
key; now the choice stays where it was, data clearing keeps protecting that
key, and a warning is logged outside production. The same applies to every
provider runtime, including Svelte's. Migration: remount the provider to move
storage.

Behaviour that changes:

- A `prefetch` that is still marked `initialPolicyPending` is no longer
  adopted as the answer: the provider sends `/init`.
- Adopting a server-resolved `prefetch` raises `init:applied`, as an `/init`
  response does.
- A streamed `prefetch` that carries an experiment but arrives after mount
  keeps `experiment` in the `/init` request the provider falls back to.
- A provider rendered under a `consentSource` raises `init:applied` once the
  source is connected.
- After mount, a new `user`, `consentCategories`, `vendors`, `scripts` or
  blocker options apply once a small chunk has loaded, the first time options
  change. `enabled` and `overrides` still apply at once.

### Provider runtime

- `c15t/runtime/provider` (`@c15t/core/runtime/provider`) exports what a
  provider that loads modules on demand needs: `createConsentProviderRuntime`,
  `lazyRuntimeModule` and `lazyStreamPrefetch`, which loads the
  streamed-prefetch code only for a runtime whose `prefetch` is a promise.
  Importing `c15t/runtime` instead can keep the statically imported default
  modules in the first chunk under esbuild.
- `update()` returns a promise that settles once every change has applied.
  The comparison behind it loads with the first `update()`.
- IAB mounts through a new `mountIAB` module (`mountRuntimeIAB`, part of
  `defaultRuntimeModules`). A provider that passes its own modules without it
  ignores `iab`.
- With a script loader that loads on demand, data clearing now subscribes after
  the loader has loaded, so revocation callbacks run before browser data is
  removed.
- `persistence.now` is passed through to persistence; the runtime used to drop
  it.
