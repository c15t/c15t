---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Rename the Svelte and Astro server helpers to match Next.js and TanStack Start

**Breaking.** `@c15t/svelte/server` merges `readInitialConsentConfig` and `prefetchInitialConsent` into `resolveConsent(options)`. Without `backendURL` it reads cookies and headers only and makes no network call. With `backendURL` it also calls `/init`. It returns `ConsentState`, the serializable state the provider's `prefetch` prop takes.

| Before | After |
| --- | --- |
| `prefetchInitialConsent(options)` | `resolveConsent(options)` with `backendURL` |
| `readInitialConsentConfig(options)` | `resolveConsent(options)` without `backendURL` |
| `PrefetchInitialConsentOptions`, `ReadInitialConsentConfigOptions` | `ResolveConsentOptions` |
| `KernelConfig` returned by `loadConsent` and stored on `event.locals.c15t.config` | `ConsentState` |

`ConsentRequestOptions` is now exported from `@c15t/svelte/server` as well as `@c15t/svelte/kit`.

`@c15t/astro/server` and `c15t/astro/server` no longer export `readInitialConsentConfig`. Use `resolveConsentContext`.
