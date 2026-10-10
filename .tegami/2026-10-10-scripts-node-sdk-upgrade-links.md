---
packages:
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
---

### Fix upgrade links in the package READMEs

The `@c15t/node-sdk` README now links to the Node.js SDK section of the
self-host upgrade guide. The `@c15t/scripts` README and npm homepage link to
the `scripts-to-integrations` codemod. Both used to point at the root
`/docs/upgrade-v3` guide, which has been removed.
