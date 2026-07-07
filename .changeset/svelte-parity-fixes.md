---
"@c15t/svelte": patch
---

Fix cross-framework parity divergences with `@c15t/react`:

- `ConsentManagerProvider` now honors the `offlinePolicy` option (policy model, policy packs, decision, and snapshot token are wired through the offline transport), so IAB components render when an IAB policy is configured
- Inline fallback policy now applies the compact banner/dialog UI profiles, matching React's offline defaults (widget footer renders the same action groups)
- Export `Dialog.Portal` from the dialog primitive namespace (previously `undefined`, silently rendering nothing)
- Remove non-canonical `data-scope` attribute from the consent widget switch
- Fix `nested-interactive` axe violation in IAB purpose/stack/vendor switches (removed hidden form inputs nested inside `role="switch"` buttons)
- IAB dialog icons are exposed to the accessibility tree and the close button uses the `common.close` translation, matching React
