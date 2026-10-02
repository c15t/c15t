---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Migrate Node module imports to the integrations package

The `scripts-to-integrations` codemod now recognizes `require` functions
created by Node's imported `createRequire()`, including aliased imports. It
leaves custom functions and shadowed parameters unchanged. Codemods also scan
`.mts`, `.cts`, `.mjs`, and `.cjs` source files.
