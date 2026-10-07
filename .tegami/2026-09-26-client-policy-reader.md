---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Keep policy pack resolution out of client bundles

Client bundles no longer carry the policy validator and hashing code, and pages
no longer resolve the disabled-mode policy on startup. In a Next.js 16 App
Router production build, first-load JavaScript drops by 17,665 bytes (5,313
bytes gzip). Public exports are unchanged.
