---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Name the CLI's release line in the packages-to-c15t warning

When `package.json` lists `@c15t/react` or `@c15t/nextjs` without c15t 3, the `packages-to-c15t` warning now tells you to install `c15t` from the CLI's release line, such as `c15t@3`, instead of always naming `c15t@alpha`.
