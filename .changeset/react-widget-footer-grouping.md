---
'c15t': patch
'@c15t/react': patch
'@c15t/ui': patch
---

The React consent widget now groups its footer actions the way every other
surface does.

With a policy that carries no UI hints, `useHeadlessConsentUI` fell back to
a single undifferentiated action group, so the preference centre rendered
reject, accept and save in one row while the banner — which had its own
local `DEFAULT_LAYOUT` — split them. Svelte, Vue and Astro all split.

`@c15t/core` now exports `DEFAULT_POLICY_ACTION_LAYOUT`
(`[['reject', 'accept'], 'customize']`), re-exported from
`@c15t/ui/utils`, and `useHeadlessConsentUI` applies it to both surfaces.
The banner's local constant is gone, so the two cannot drift again.

The banner's `customize` action now renders inside its own sub-group
rather than as a loose child of the footer, which is what the shared
`consent-actions` `space-between` layout expects and what the other
frameworks already produced.
