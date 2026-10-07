---
packages:
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Match the DevTools panel to its host theme

DevTools panels embedded in Nuxt DevTools and TanStack Devtools use their own
light and dark palette instead of the app's consent theme. The TanStack plugin
follows the TanStack Devtools theme. Embedded panels at least 48rem wide use a
wider layout with tiles, columns and an event log. The floating panel no longer
mixes the consent theme with operating-system colors.

`c15tDevtools()` returns a render function, which TanStack Devtools calls with
its theme. `C15tTanStackDevtoolsPanel` accepts a `theme` prop of `'light'` or
`'dark'`.
