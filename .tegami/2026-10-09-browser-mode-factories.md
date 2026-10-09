---
packages:
  '@c15t/browser': minor
---

### `init()` from `@c15t/browser` takes a mode factory

`init()` and `createConsentClient()` from `@c15t/browser`,
`@c15t/browser/headless` and `@c15t/browser/iab` require `mode`, a factory
from `manifest()`, `hosted()`, `offline()` or `custom()`. The entries no
longer import every transport, so a bundle keeps only the mode it uses. The
JavaScript quickstart drops about 12 KB gzip, including the offline policy
pack.

With `consentManifest()` from `c15t/build`, `manifest()` reads the policy
snapshot and the backend URL from `c15t/generated`, and `hosted()` reads the
backend URL:

```ts
import { init, manifest } from '@c15t/browser';

init({ mode: manifest() });
```

A link to `#c15t-preferences` opens the preference dialog without code.

Breaking for earlier v3 alphas: the `backendURL`, `manifest`, `manifestURL`
and `policyRules` options and mode names such as `mode: 'hosted'` are removed
from these entries.

| Before | After |
| --- | --- |
| `init({ backendURL })` | `init({ mode: hosted({ backendURL }) })` |
| `init({ mode: 'manifest', manifest: snapshot, backendURL })` | `init({ mode: manifest() })` |
| `init({ policyRules: ['europeOptIn'] })` | `init({ mode: offline({ policyRules: [policyRulePresets.europeOptIn()] }) })` |

The script-tag builds (`c15t.js`, `c15t.offline.js`, `c15t.headless.js`,
`c15t.iab.js`) still read mode names and these options from `data-*`
attributes and `c15t.push(['config', …])`. Their option type is now
`ScriptTagClientOptions`. `@c15t/browser/hosted` and
`@c15t/browser/offline` keep their options.
