---
packages:
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Route files that import `consentLoaderOptions` no longer pull consent code into other chunks

Route definitions ship to the browser, so a route file that imports `consentLoaderOptions` from `@c15t/tanstack-start/server` used to bring the server helpers' imports of `@c15t/core` into the client build's module graph. Vite split chunks by that graph: each consent route loaded about 3 KB more gzip in 5 extra files, and routes without c15t loaded 5 extra files too.

Browser builds now resolve `@c15t/tanstack-start/server` (and `c15t/tanstack-start/server`) to a build that exports `consentLoaderOptions` and nothing else that imports code. `resolveConsent()`, `createConsentStateHandler()` and `mergeInitIntoConsentState()` keep their names there so client code still builds, but calling one in the browser throws: they read the request and run on the server only.
