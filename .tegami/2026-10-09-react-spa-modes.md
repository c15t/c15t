---
packages:
  '@c15t/react': minor
  '@c15t/core': minor
  c15t: minor
---

### `c15t/react` exports the modes, defaulting to what the build downloaded

Import `manifest`, `hosted` and `offline` from `c15t/react`. React apps no
longer import anything from `@c15t/browser`. With `consentManifest()` from
`c15t/build` in the Vite config, `manifest()` needs no arguments: it reads the
policy snapshot and the backend URL from `c15t/generated`. `hosted()` reads
the same backend URL.

```tsx
import { ConsentProvider, manifest } from 'c15t/react';

<ConsentProvider options={{ mode: manifest() }}>{children}</ConsentProvider>;
```

Pass `snapshot`, `manifestURL`, `backendURL` or `source: 'runtime'` to
override the build's values. `@c15t/react` keeps these modes on its
`@c15t/react/modes` entry, so the Next.js and TanStack Start entries, which
re-export `@c15t/react`, never import the build's snapshot module.

`consentManifest()` from `c15t/build` now warns when the downloaded policy
depends on the visitor's location. The browser can't resolve such a policy
on its own, so `manifest()` still asks the backend's `/init` on the first
visit unless the page passes `inputs` or `geoURL`. The warning suggests
`hosted()`.

The browser manifest resolver loads each language's base copy and the IAB
vendor list on demand, so a single-page app's first-load JavaScript names one
language chunk instead of one per language, and carries no IAB code.

`Frame`, `FrameRoot`, `FrameTitle` and `FrameButton`, the v2 names for
`ConsentGate` and its parts, now log a one-time warning outside production.
They still render `ConsentGate`.
