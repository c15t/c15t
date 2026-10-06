---
packages:
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/nextjs": patch
---

### Consented scripts start sooner when the provider already knows the choice

The script loader loads on demand, and used to wait until the provider
mounted, after the whole page had rendered or hydrated. A provider now starts
that download during its first render in the browser when consent already
lets one of its `scripts` run, so a returning visitor's consented scripts no
longer wait for one more request after hydration.

The provider decides as it would once mounted, on its own runtime: with its
`prefetch`, or the state from `resolveConsent()` once a streamed one arrives,
under the current policy, with Global Privacy Control, the visitor's vendor
switches and any newer denial stored in the browser applied. A script with
`alwaysLoad` counts for every visitor, and so does every script with
`enabled: false`. With a `consentSource`, only `alwaysLoad` scripts count,
since the external source decides after mount.

This covers `ConsentRoot` in Next.js and TanStack Start, and `ConsentProvider`
with a `prefetch`. First visits and stored choices that allow none of the
scripts load the chunk at mount, as before. No visitor downloads more: every
page with `scripts` already loaded the chunk. There is nothing to configure.
