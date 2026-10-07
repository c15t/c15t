---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/translations': patch
  '@c15t/browser': patch
---

### Keep development warnings out of production builds

Development warnings, such as "Vendor … has no declaration", printed in
production browser builds. They now read `process.env.NODE_ENV`, which
bundlers replace at build time. Without a bundler or `process`, the warnings
still show.
