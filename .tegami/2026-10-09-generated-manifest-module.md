---
packages:
  c15t: minor
  '@c15t/core': minor
  '@c15t/nextjs': minor
  '@c15t/svelte': minor
  '@c15t/tanstack-start': minor
  '@c15t/vue': minor
---

### The build-time manifest is a module, not a file in your app

The build integrations no longer write `c15t-manifest.ts` into your source
tree, so there is nothing to add to `.gitignore` and type checks pass on a
fresh clone. Import the snapshot from `c15t/generated` (or
`@c15t/core/generated`) instead:

```ts
import { snapshot } from 'c15t/generated';

const mode = manifest({ backendURL, manifest: snapshot });
```

The module exports `snapshot`, the fetched manifest, and `backendURL`, the
URL the build read it from. Both are `undefined` when the build has no
snapshot, so the app reads the policy at runtime.

- The Vite plugins (`consentManifest` from `c15t/build`,
  `c15t/tanstack-start/build`, `@c15t/vue/vite` and `@c15t/svelte/vite`)
  serve it as a virtual module. In TanStack Start and SvelteKit, the browser
  bundle gets `snapshot: undefined`, so the snapshot stays on the server.
  Single-page apps get it in the browser, as before.
- `withConsentManifest` in Next.js writes the snapshot to
  `node_modules/.cache/c15t/` and points `c15t/generated` at it. Importing
  it from a client component fails the build, because the browser copy
  imports `server-only`. The wrapper also adds `c15t`, `@c15t/core` and
  `@c15t/nextjs` to `transpilePackages`, so Pages Router server code sees
  the snapshot.

The `outputFile`, `exportName`, `importSource` and `rootDir` options are
removed. Delete `c15t-manifest.ts` and its `.gitignore` entry, and replace
`import { consentManifest } from './c15t-manifest'` with
`import { snapshot } from 'c15t/generated'`.
