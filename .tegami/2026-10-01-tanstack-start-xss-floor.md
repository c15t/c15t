---
packages:
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### Require a TanStack Start release with the server-function XSS fix

The `@tanstack/react-start` peer range starts at 1.168.60 and
`@tanstack/react-router` at 1.170.41. Start releases from 1.143.12 up to that
point are affected by CVE-2026-102989, a reflected XSS in server-function
responses (GHSA-qx66-fv34-fjm8). Upgrade both packages together.
