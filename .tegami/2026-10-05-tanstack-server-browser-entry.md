---
packages:
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Keep `consentLoaderOptions` imports from bloating TanStack Start chunks

A route file that imports `consentLoaderOptions` from
`@c15t/tanstack-start/server` used to pull consent code into the client build,
adding about 3 KB gzip in 5 extra files to each consent route. Browser builds
now resolve `@c15t/tanstack-start/server` and `c15t/tanstack-start/server` to
a slim build.

`resolveConsent()`, `createConsentStateHandler()` and
`mergeInitIntoConsentState()` still import in client code, but throw if called
in the browser.
