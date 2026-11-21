---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Fix the IAB banner and dialog

- The script-tag UI shows a registered vendor's data categories.
- The script-tag IAB banner shows the partner count once.
- In Vue, the partners link opens the dialog on the vendor list.
- A failed IAB save is reported once. `saveIABConsentSurface` resolves
  `{ ok: false }` instead of rejecting.
- Vue records no IAB choice when no CMP is mounted.
