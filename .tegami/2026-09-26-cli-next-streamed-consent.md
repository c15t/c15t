---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Stream consent in the generated Next.js App Router wrapper

With `--ssr`, `c15t setup` generated an async `ConsentManager` that made
every response wait for the backend's `/init`. The generated component is
synchronous and passes the pending `resolveConsent` result to the client
provider. Pages render without waiting, and the banner mounts after
hydration.

To keep the banner in the server HTML, make `ConsentManager` async, await
`resolveConsent`, and wrap it in `<Suspense>` in the layout. Existing
generated files are not changed.
