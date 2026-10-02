---
packages:
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### Require a TanStack Start release with the server-function XSS fix

The `@tanstack/react-start` peer range now starts at 1.168.60, and `@tanstack/react-router` at 1.170.41, the release Start 1.168.60 pins. Earlier Start releases from 1.143.12 are affected by CVE-2026-102989, a reflected XSS in server-function responses (GHSA-qx66-fv34-fjm8). Package managers now warn when an app installs `@c15t/tanstack-start` next to an affected Start release. Upgrade both packages together.
