---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Runtime for framework providers

`@c15t/core/runtime` adds `createConsentProviderRuntime(options, modules)`, the
runtime a framework provider renders when its options follow its props. On top
of everything `createConsentRuntime` does, it has:

- `update(options)`, which compares a provider's new options with the previous
  ones and applies only what changed: a new user is identified, new overrides
  resolve the policy again, scripts, rules and vendors are declared again, and
  the network and iframe blockers are added, updated or removed.
- `setEnabled(enabled)`, `enabled` and `subscribe(listener)`. Turning
  `enabled` off renders a separate permissive kernel and keeps the visitor's
  records for when it is turned back on.
- A `prefetch` that is still a promise, when `streamPrefetch` is in its
  modules. The first `/init` waits for it and applies the result instead of
  sending a request.
- A choice of module loading: pass `defaultRuntimeModules`, or swap a factory
  for `lazyRuntimeModule(() => import(...))`.

Every runtime also gains `setLanguage(code)` and `experiment`, and
`setConsentCategories(undefined)` drops the configured list.

`createConsentRuntime` now loads the network blocker and data clearing as
separate chunks, and only when they are configured. Matching requests stay
held until the blocker has loaded.

`@c15t/svelte`'s `ConsentManagerProvider` uses the provider runtime. `enabled`,
`scripts`, `vendors`, `networkBlocker`, `iframeBlocker` and `callbacks` now
update after mount. The `user` the provider mounts with is no longer
identified again on mount; it is sent with `/init` and every save, and a later
change is identified.

**Breaking.** In `@c15t/svelte`, `enabled: false` grants every category, so
every gated script loads, as in React. It used to only close the UI.
Migration: set `enabled: false` only where every script may load, such as an
internal preview build. To hide the UI and keep consent gating, leave
`enabled` on and don't render the banner or dialog.

`@c15t/browser`'s `setLanguage()` does nothing for the current language and no
longer requests the policy while the client is disabled or uses
`consentSource`. `presentation` and the UI theme follow an experiment the
server resolved into `prefetch`.
