---
packages:
  '@c15t/nextjs': patch
---

### Send the first manifest-mode save without loading the resolver

With `ConsentRoot` and a `manifestURL` config, the first consent save no longer downloads the manifest resolver and every translation before it posts. When the server already resolved the visitor's state, the browser never runs init, so `POST /subjects` goes out right away with the same body, including the policy id, fingerprint, country, region, language and GPC signal the backend checks. A preferences dialog now closes as soon as that request returns, instead of waiting for about 64 KB of gzipped JavaScript first. When the browser does resolve init from the manifest, saves keep using that resolver as before.
