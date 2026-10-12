---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
---

### Send the first manifest-mode save without loading the resolver

With `ConsentRoot` and a `manifestURL` config, when the server already
resolved the visitor's state, the first save sends `POST /subjects` right
away. It no longer downloads the manifest resolver and every translation
first, about 64 KB of gzipped JavaScript, so the preferences dialog closes as
soon as the request returns.
