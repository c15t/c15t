---
packages:
  '@c15t/react': minor
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

The browser manifest resolver loads on demand. When the policy depends on a
location the page doesn't know, the browser asks `/init` and never downloads
the resolver. Otherwise the resolver starts loading as soon as `manifest()`
runs. Each language's base copy and the IAB vendor list load only when a
visitor needs them. The React quickstart's first-load JavaScript is about
3.8 KB gzip smaller.

With `preloadDialog: 'idle'`, the default, the deferred `ConsentDialog`
starts loading three seconds after the load event, in idle time, instead of
in the first idle time after it. Hovering, focusing or touching a button that
opens the dialog still loads it at once.

`ConsentTheme` and `defineTheme` are importable from the new
`c15t/react/theme` entry, which a Server Component can import.

Deprecated, still working: `Frame`, `FrameRoot`, `FrameTitle` and
`FrameButton`, the v2 names for `ConsentGate` and its parts, and the
`FrameProps` type. The components still render `ConsentGate`, and now log a
one-time warning outside production.
