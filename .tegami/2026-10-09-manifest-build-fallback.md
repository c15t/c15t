---
packages:
  c15t: minor
  '@c15t/core': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
---

### Next.js and TanStack Start builds no longer stop when the manifest fetch fails

`withConsentManifest` in Next.js and the `consentManifest` Vite plugin in
TanStack Start now fall back to runtime fetching, as Astro and Nuxt already
do. If the manifest fetch fails or takes longer than 10 seconds, the build
logs a warning and keeps going. The generated `c15t-manifest.ts` then exports
`consentManifest` as `undefined`, so your imports still compile and the server
fetches and caches the policy at runtime. A backend outage or a CI runner
without network access no longer breaks the build.

Set `onBuildError: 'fail'` to stop the build when the fetch fails, as before:

```ts
withConsentManifest(nextConfig, { backendURL, onBuildError: 'fail' });
consentManifest({ backendURL, onBuildError: 'fail' });
```

The build skips the fetch, logs why and writes the same `undefined` export
when it can't use a snapshot: a `backendURL` that is not an absolute http(s)
URL, and in Next.js, `output: 'export'`. With `onBuildError: 'fail'`, a
relative `backendURL` still stops the build.

The plain Vite plugins in `c15t/build`, `@c15t/vue/vite` and
`@c15t/svelte/vite` are unchanged and still stop the build on a failed fetch.
