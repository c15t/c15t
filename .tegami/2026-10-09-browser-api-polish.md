---
packages:
  '@c15t/browser': minor
---

### `init()` from `@c15t/browser` takes a mode factory

Breaking for earlier v3 alphas. `init()` and `createConsentClient()` from
`@c15t/browser`, `@c15t/browser/headless` and `@c15t/browser/iab` require
`mode`, a factory from `manifest()`, `hosted()`, `offline()` or `custom()`.
The entries no longer import every transport, so a bundle keeps only the mode
it uses. The JavaScript quickstart drops about 12 KB gzip, including the
offline policy pack.

With `consentManifest()` from `c15t/build`, `manifest()` reads the policy
snapshot and the backend URL from `c15t/generated`, and `hosted()` reads the
backend URL (from `VITE_C15T_BACKEND_URL`, then `VITE_INTH_PROJECT_URL`):

```ts
import { init, manifest } from '@c15t/browser';

init({ mode: manifest() });
```

When the build has no snapshot, `manifest()` fetches
`${backendURL}/manifest` instead of requesting `/api/c15t/manifest` on the
site's own origin. `manifest()` resolves with the shared browser resolver: it
bundles English base copy and loads other languages when a visitor needs
them. A link to `#c15t-preferences` opens the preference dialog without code.

Removed from these entries, with no deprecated alias:

| Before | After |
| --- | --- |
| `init({ backendURL })` | `init({ mode: hosted({ backendURL }) })`, or `hosted()` with `consentManifest()` |
| `init({ mode: 'hosted' })`, `'manifest'`, `'offline'` | `init({ mode: hosted() })`, `manifest()`, `offline()` |
| `init({ mode: 'manifest', manifest: snapshot, backendURL })` | `init({ mode: manifest() })` |
| `init({ manifestURL })` | `init({ mode: manifest({ manifestURL }) })` |
| `init({ policyRules: ['europeOptIn'] })` | `init({ mode: offline({ policyRules: [policyRulePresets.europeOptIn()] }) })` |
| `manifest({ manifest })` | `manifest({ snapshot })` |

`manifest()`'s `inputs` take only `country` and `region`.

The script-tag builds (`c15t.js`, `c15t.offline.js`, `c15t.headless.js`,
`c15t.iab.js`) still read mode names and these options from `data-*`
attributes and `c15t.push(['config', …])`. Their option type is now
`ScriptTagClientOptions`. `@c15t/browser/hosted` and `@c15t/browser/offline`
keep their options. The script-tag builds bundle the code that saves consent
instead of loading it as a second request, so `c15t.js` is slightly smaller.
