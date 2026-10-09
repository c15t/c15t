---
packages:
  '@c15t/core': minor
  '@c15t/browser': minor
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/cli': patch
  c15t: minor
---

### Consent modes as data, and one browser manifest resolver

`@c15t/core/modes` exports `manifest()`, `hosted()` and `offline()` as plain
data factories. Each returns a serializable `{ type, …options }` object with
no imports behind it, typed as `ConsentMode`:

```ts
import { hosted, manifest, offline } from '@c15t/core/modes';

manifest(); // { type: 'manifest' }
manifest({ resolve: 'browser', geoURL: '/api/geo' });
hosted({ backendURL: 'https://your-project.inth.app' });
offline({ policyRules });
```

`manifest()` takes `source` (`'build'` or `'runtime'`) or `snapshot`, never
both. Framework packages will take this data in their config in later
releases.

`@c15t/core/runtime/client-mode` turns that data into a transport for a
server-rendered page. For `manifest()` resolved on the server and for
`hosted()`, first-load JavaScript holds only the record transport and the
init-request builder. The hosted init path, browser resolution and offline
mode load with `import()` when they run.

`@c15t/core/transports/manifest-browser` resolves a manifest in the browser.
It bundles English base copy and loads other languages with
`import('@c15t/translations/<lang>')` the first time a visitor needs one. When
the policy depends on a location the page doesn't know, it asks `geoURL`, then
the backend's `/init`. `@c15t/browser`'s `manifest()` now comes from here, and
Vue's client manifest mode and the Next.js root use it instead of the
all-languages resolver, so they no longer download every language.
`@c15t/core/transports/manifest` bundles every language and is now for server
code only.

`hosted()`, `offline()` and `manifest()` return factories that carry their
options as enumerable data, so they satisfy `ConsentMode` too. Transport
factories can report `kind: 'manifest'`.

Breaking for earlier v3 alphas:

- `hosted({ url })` is now `hosted({ backendURL })`. The `url` option is
  removed.
- `hosted()` asserts the resolved decision on saves whenever `initURL` is set.
  Pass `assertDecisionInputs: false` to turn that off.
- `createManifestTransport({ manifest })` is now
  `createManifestTransport({ snapshot })`.
- `@c15t/browser`'s `manifest({ manifest })` is now `manifest({ snapshot })`,
  and its `inputs` take only `country` and `region`.
- `hostedModes` is removed from `@c15t/core/runtime/provider`. Use
  `readHostedMode(mode)`.

The CLI templates and the `consent-provider-options` codemod write
`hosted({ backendURL })`.
