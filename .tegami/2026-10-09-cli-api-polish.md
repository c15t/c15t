---
packages:
  '@c15t/cli': patch
---

### `c15t generate` and the codemods write the v3 mode options

The `c15t generate` templates and the `consent-provider-options` codemod write
`hosted({ backendURL })` instead of `hosted({ url })`. The Astro boilerplate
writes `ConsentDialogLink` instead of `ConsentDialogTrigger`. The TanStack
Start template no longer writes `initRoute={false}`, which is now the default.
