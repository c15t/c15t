---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### React provider on the shared runtime

`ConsentProvider` in `@c15t/react` uses the shared
`createConsentProviderRuntime`, like the Svelte provider. Its props, hooks and
`runtime` prop are unchanged. `ConsentRoot` in `@c15t/nextjs` and
`@c15t/tanstack-start` picks this up.

**Breaking.** Every provider runtime, including Svelte's, reads `persistence`
and `storageConfig` once at mount. A new storage key no longer moves the stored
choice, which stays under the old key. Remount the provider to move storage.

**Breaking.** `@c15t/ui/utils/dom` no longer exports `setupColorScheme`. Import
it from `@c15t/ui/utils/color-scheme` or `@c15t/ui/utils`.

Behavior changes:

- A `prefetch` still marked `initialPolicyPending` is not adopted. The provider
  sends `/init` instead.
- Adopting a server-resolved `prefetch` raises `init:applied`. So does a
  provider under a `consentSource`, once the source connects.
- After mount, a new `user`, `vendors`, `scripts` or blocker options apply once
  a small chunk loads. `enabled`, `overrides` and `consentCategories` still
  apply at once.
- `ConsentProvider` downloads the code that applies a `prefetch` promise only
  when it gets one. `ConsentRoot` ships it in the first-load chunk.
- Under esbuild code splitting, an app that imports only `ConsentProvider` or a
  hook no longer loads the dialog trigger, branding and draft modules on first
  load.
- With an on-demand script loader, revocation callbacks run before browser
  data is removed.

`c15t/runtime/provider` (`@c15t/core/runtime/provider`) adds:

- `createConsentProviderRuntime`, `lazyRuntimeModule` and `lazyStreamPrefetch`
  for providers that load modules on demand.
- `update()` returns a promise that settles once every change has applied.
- `connectConsentSource` and `mountIAB` (`mountRuntimeIAB`) modules in
  `defaultRuntimeModules`. Until a `consentSource` connects, no optional
  category is granted. A provider that passes its own modules without
  `mountIAB` ignores `iab`.
- `persistence.now` is passed through to persistence. The runtime used to drop
  it.
