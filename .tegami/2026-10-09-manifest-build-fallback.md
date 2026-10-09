---
packages:
  c15t: minor
  '@c15t/astro': minor
  '@c15t/browser': minor
  '@c15t/core': minor
  '@c15t/nextjs': minor
  '@c15t/svelte': minor
  '@c15t/tanstack-start': minor
  '@c15t/vue': minor
---

### One rule for failed build-time manifest fetches, and `onBuildError`

Every integration that bundles the manifest at build time now handles a
failed fetch the same way: `withConsentManifest` in Next.js, the
`consentManifest` Vite plugin in TanStack Start, `c15t/build`,
`@c15t/vue/vite` and `@c15t/svelte/vite`, the Nuxt module, and the Astro
integration.

- The fetch waits at most 10 seconds.
- A production build (`next build`, `vite build`, `nuxt build`,
  `astro build`) stops with an error that names the URL and the cause. A
  missing backend URL stops it too.
- Dev (`next dev`, `vite dev`, `nuxt dev`, `astro dev`) logs a warning and
  keeps going. The server fetches the policy at runtime. `c15t/generated`
  then exports `snapshot` as `undefined`, so imports still compile.

Astro and Nuxt builds used to warn and continue by default. They now stop,
like the other frameworks.

The new `onBuildError` option picks one behaviour for both commands:
`'fail'` stops dev too, and `'runtime'` lets a production build continue and
fetch at runtime. The `C15T_ON_BUILD_ERROR` environment variable overrides
the option, so you can deploy during a backend outage without a code change:

```sh
C15T_ON_BUILD_ERROR=runtime npm run build
```

In Astro and Nuxt, `buildManifest: true` still works and now means
`onBuildError: 'fail'`. It is deprecated. `buildManifest: false` is
unchanged.

The build reads the backend URL from the framework's public variable when
you don't pass one, from the environment or a `.env` file:
`NEXT_PUBLIC_C15T_BACKEND_URL`, `NUXT_PUBLIC_C15T_BACKEND_URL`,
`PUBLIC_C15T_BACKEND_URL` (Astro and SvelteKit) or `VITE_C15T_BACKEND_URL`
(TanStack Start, `c15t/build`, `@c15t/vue/vite` and `@c15t/svelte/vite`). You
can drop the `process.env.… ??` line from your config. The Vite plugins also
set an unset `VITE_C15T_BACKEND_URL` to the URL they used, so
`import.meta.env` in app code reads the same value.

The build still skips the fetch, without an error, when it can't use a
snapshot: a relative backend URL, Next.js `output: 'export'`,
`nuxt generate`, `ssr: false`, and `hosted()` or `offline()` in Astro. With
`onBuildError: 'fail'`, a relative URL stops the build. With
`onBuildError: 'runtime'`, a missing URL skips the fetch with a notice.

When the snapshot is `undefined`, the browser falls back too:
`manifest({ backendURL, manifest: undefined })` in `@c15t/browser` fetches
`${backendURL}/manifest`, and the plain Vue plugin in client manifest mode
does the same instead of requesting `/api/c15t/manifest` on the site's own
origin.
