---
packages:
  "@c15t/react": patch
---

### Keep the dialog-trigger icons out of the banner's first load

The fingerprint and settings icons of `ConsentDialogTrigger` shared a module with the branding logos the banner renders, so every page that showed the banner downloaded them. They now live next to the trigger and load with it. A Next.js App Router page with the banner ships about 530 fewer gzipped bytes of JavaScript on first load.
