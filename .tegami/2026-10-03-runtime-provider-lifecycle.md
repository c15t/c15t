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

`@c15t/core/runtime` adds `createConsentProviderRuntime(options, modules)` for
framework providers whose options follow their props. Beyond
`createConsentRuntime`, it has:

- `update(options)`, which applies only the options that changed.
- `setEnabled(enabled)`, `enabled` and `subscribe(listener)`. Turning
  `enabled` off keeps the visitor's records for when it is turned back on.
- Support for a `prefetch` promise when `streamPrefetch` is in its modules.
- `defaultRuntimeModules`, or `lazyRuntimeModule(() => import(...))` to load a
  module lazily.

Every runtime gains `setLanguage(code)` and `experiment`, and
`setConsentCategories(undefined)` drops the configured list.
`createConsentRuntime` loads the network blocker and data clearing only when
they are configured.

`@c15t/svelte`'s `ConsentManagerProvider` uses the provider runtime, so
`enabled`, `scripts`, `vendors`, `networkBlocker`, `iframeBlocker` and
`callbacks` update after mount.

Breaking. In `@c15t/svelte`, `enabled: false` grants every category and loads
every gated script, as in React. It used to only close the UI. Set
`enabled: false` only where every script may load, such as an internal preview
build. To hide the UI and keep gating, leave `enabled` on and don't render the
banner or dialog.

`@c15t/browser`'s `setLanguage()` no longer requests the policy while the
client is disabled or uses `consentSource`.
