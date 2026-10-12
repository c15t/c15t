---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Keep the dialog-trigger icons out of the banner's first load

`ConsentDialogTrigger`'s fingerprint and settings icons load with the trigger
instead of with the banner. A Next.js App Router page with the banner ships
about 530 fewer gzipped bytes of JavaScript on first load.
