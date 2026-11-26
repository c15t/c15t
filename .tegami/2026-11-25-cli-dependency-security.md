---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Update zod and postcss in the CLI

`@c15t/cli` now depends on zod 4.6.7 and postcss 8.5.33, which fix published
security advisories in the versions it pinned before.
