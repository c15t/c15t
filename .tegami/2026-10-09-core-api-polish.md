---
packages:
  '@c15t/core': minor
  c15t: minor
---

### Consent modes as data, `c15t/generated` and one build-failure policy

Breaking for earlier v3 alphas. Every name below was alpha-only, so it is
removed with no deprecated alias.

**Modes as data.** `c15t/modes` (`@c15t/core/modes`) exports `manifest()`,
`hosted()` and `offline()` as plain data factories. Each returns a
serializable `{ type, …options }` object, typed as `ConsentMode`, with no
imports behind it. Server-rendered frameworks take this data in their config.

```ts
import { hosted, manifest, offline } from 'c15t/modes';

manifest(); // { type: 'manifest' }
manifest({ resolve: 'browser', geoURL: '/api/geo' });
hosted({ backendURL: 'https://your-project.inth.app' });
offline({ policyRules });
```

`manifest()` takes `source` (`'build'`, the default, or `'runtime'`) or
`snapshot`, never both, plus `resolve`, `manifestURL`, `geoURL` and `inputs`.

`hosted()`, `offline()` and `manifest()` as transports carry their options as
enumerable data too, so they satisfy `ConsentMode`. Transport factories can
report `kind: 'manifest'`.

**First-load JavaScript.** `c15t/runtime/client-mode` turns mode data into a
transport for a server-rendered page. For `manifest()` resolved on the server
and for `hosted()`, first-load JavaScript holds only the record transport and
the init-request builder. The hosted init path, browser resolution and
offline mode load with `import()` when they run, from self-contained chunks,
so Vite and Turbopack don't split a page's first-load chunk around them.
`clientMode()` takes `initialData`, an init response a prefetch script already
requested.

**One browser manifest resolver.** `c15t/transports/manifest-browser`
resolves a manifest in the browser. It bundles English base copy and loads
other languages with `import('@c15t/translations/<lang>')` the first time a
visitor needs one. When the policy depends on a location the page doesn't
know, it asks `geoURL`, then the backend's `/init`. `@c15t/browser`, React,
Svelte, Vue and the Next.js root use it instead of the all-languages
resolver, so they no longer download every language.
`c15t/transports/manifest` bundles every language and is for server code
only.

**`c15t/generated`.** The build integrations no longer write
`c15t-manifest.ts` into your source tree, so there is nothing to add to
`.gitignore` and type checks pass on a fresh clone. `c15t/generated`
(`@c15t/core/generated`) exports `snapshot`, the fetched manifest, and
`backendURL`, the URL the build read it from. Both are `undefined` when the
build has no snapshot. In the browser bundle of TanStack Start and SvelteKit,
`snapshot` is always `undefined`; single-page apps get it in the browser.
Most apps never import it: the framework helpers read it themselves.

**One rule for failed build-time manifest fetches.** Every build integration
handles a failed fetch the same way: `withConsentManifest` in Next.js, the
`consentManifest` Vite plugins (`c15t/build`, `c15t/tanstack-start/build`,
`c15t/vue/vite`, `@c15t/svelte/vite`), the Nuxt module and the Astro
integration.

- The fetch waits at most 10 seconds.
- A production build (`next build`, `vite build`, `nuxt build`,
  `astro build`) stops with an error that names the URL and the cause.
- Dev (`next dev`, `vite dev`, `nuxt dev`, `astro dev`) logs a warning and
  fetches the policy at runtime. `snapshot` is then `undefined`.
- A missing backend URL follows the same rule.
- The new `onBuildError` option picks one behaviour for both commands:
  `'fail'` stops dev too, and `'runtime'` lets a production build continue
  and fetch at runtime. The `C15T_ON_BUILD_ERROR` environment variable
  overrides it, so you can deploy during a backend outage without a code
  change: `C15T_ON_BUILD_ERROR=runtime npm run build`.
- The fetch is skipped, without an error, for a relative backend URL. With
  `onBuildError: 'fail'`, a relative URL stops the build.
- The Vite plugins fetch only for a bundle that reads `snapshot`. A
  single-page app picks its mode in app code, so `vite build` fills the
  snapshot in after tree-shaking: a React, Vue, Svelte or JavaScript app
  that uses `hosted()` or `offline()` never contacts the backend during the
  build, and a backend outage no longer stops it. `vite dev` fetches when
  the app first loads `c15t/generated`.

The build reads the backend URL from the framework's public variable when you
don't pass one, from the environment or a `.env` file:
`NEXT_PUBLIC_C15T_BACKEND_URL`, `NUXT_PUBLIC_C15T_BACKEND_URL`,
`PUBLIC_C15T_BACKEND_URL` (Astro, Svelte and SvelteKit) or
`VITE_C15T_BACKEND_URL` (TanStack Start, React, Vue and plain JavaScript).
The Vite plugins set an unset `VITE_C15T_BACKEND_URL` to the URL they used.

`consentManifest()` from `c15t/build` warns when the downloaded policy
depends on the visitor's location. A single-page app's `manifest()` then still
asks the backend's `/init` on the first visit unless the page passes `inputs`
or `geoURL`, so the warning suggests `hosted()`.

`offline()` now reports the location it resolved for, so the Vue and Astro
preference dialog shows its title.

Removed:

- `hosted({ url })`: use `hosted({ backendURL })`.
- `createManifestTransport({ manifest })`: use
  `createManifestTransport({ snapshot })`.
- `hostedModes` from `c15t/runtime/provider`: use `readHostedMode(mode)`.
- The generated `c15t-manifest.ts` file, and the build options `outputFile`,
  `exportName`, `importSource` and `rootDir`. Delete the file and its
  `.gitignore` entry, and replace
  `import { consentManifest } from './c15t-manifest'` with
  `import { snapshot } from 'c15t/generated'`.

Changed:

- `hosted()` asserts the resolved decision on saves whenever `initURL` is
  set. Pass `assertDecisionInputs: false` to turn that off.
- The error for a runtime with no `mode` names the package and the API that
  got none, such as ``@c15t/react ConsentProvider: `mode` is required. Use
  manifest() or hosted().``, instead of the v2
  `ConsentManagerProvider`. Production builds name the package only.
