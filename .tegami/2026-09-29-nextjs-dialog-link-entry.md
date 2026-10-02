---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Load only the dialog link from its subpath

`@c15t/nextjs/components/consent-dialog-link`, `@c15t/tanstack-start/components/consent-dialog-link` and their `c15t/next` and `c15t/tanstack-start` equivalents now export only `ConsentDialogLink`. They pointed at the whole adapter entry, so importing the link pulled in the rest of the adapter.
