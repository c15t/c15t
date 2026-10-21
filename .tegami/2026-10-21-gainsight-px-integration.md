---
packages:
  '@c15t/core': patch
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Gainsight PX consent integration

`gainsightPx()` loads Gainsight PX only after `measurement` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support. Regrant reuses the completed SDK and restores enable and optional identify calls. The script loader supports retaining completed loads while removing pending loader elements on revocation.
