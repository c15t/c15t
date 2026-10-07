---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/translations': patch
  '@c15t/browser': patch
---

### Keep development warnings out of production builds

Warnings meant for development, such as "Vendor … has no declaration", printed
in production browser builds. They read `NODE_ENV` through
`globalThis.process`, which bundlers do not replace and browsers do not have.
They now read `process.env.NODE_ENV`, which bundlers replace at build time, so
production builds stay quiet. Without a bundler or `process`, the warnings
still show.
