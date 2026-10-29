---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### The IAB CMP is created once under an IAB policy

When an IAB policy supplied the `cmpId` after the runtime started, the IAB
CMP was created up to 100 times on every page load, and the console showed
"Consent listeners kept updating consent in response to each other".
`createIAB` updates the kernel while it runs, and that update started the
mount again before the first CMP was stored. Now the CMP is created once.
