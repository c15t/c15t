---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Keep development warnings out of production builds

Development warnings, such as "Vendor … has no declaration", printed in
production browser builds. They now read `process.env.NODE_ENV`, which
bundlers replace at build time. Without a bundler or `process`, the warnings
still show.
