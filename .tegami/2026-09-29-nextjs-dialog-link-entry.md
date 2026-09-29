---
packages:
  '@c15t/nextjs': patch
  c15t: patch
---

### Load only the dialog link from its subpath

`@c15t/nextjs/components/consent-dialog-link` and `c15t/next/components/consent-dialog-link` now export only `ConsentDialogLink`. They pointed at the whole Next.js entry, so importing the link pulled in the rest of the adapter.
