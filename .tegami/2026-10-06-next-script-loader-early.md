---
packages:
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/nextjs": patch
  "@c15t/tanstack-start": patch
---

### `ConsentRoot` starts consented scripts sooner

The script loader loads on demand, and used to wait until the provider
mounted, after the whole page had hydrated. `ConsentRoot` in Next.js and
TanStack Start now starts that download during its first render in the
browser when consent already lets one of its `scripts` run, so a returning
visitor's consented scripts no longer wait for one more request after
hydration.

`ConsentRoot` decides as the provider would once mounted: with the state from
`resolveConsent()`, once a streamed one arrives, under the current policy,
with Global Privacy Control, the visitor's vendor switches and any newer
denial stored in the browser applied. A script with `alwaysLoad` counts for
every visitor, and so does every script when the provider has
`enabled: false`. With a `consentSource`, only `alwaysLoad` scripts count,
since the external source decides after mount.

First visits and stored choices that allow none of the scripts load the chunk
at mount, as before. No visitor downloads more: every page with `scripts`
already loaded the chunk. There is nothing to configure. `ConsentProvider`
from `@c15t/react` on its own, Vue, Svelte and the browser build still load
the chunk at mount, and ship none of the code that decides.
