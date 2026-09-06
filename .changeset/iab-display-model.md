---
'@c15t/iab': minor
'@c15t/react': patch
'@c15t/svelte': patch
'@c15t/vue': patch
'@c15t/astro': patch
---

One model now decides what every IAB surface lists. `@c15t/iab/headless`
gains `resolveIABDialogDisplayModel`, which returns the rows a preference
centre renders — the purposes a visitor decides on, the stacks, the
special features, and the locked essential rows — already in order and
each carrying its own `data-testid`. React, Svelte, Vue and the Astro
server render all read it instead of deriving their own, which had drifted
into three near-identical copies that disagreed.

A row's test-id is namespaced by kind (`purpose-item-1`,
`special-feature-item-1`, `special-purpose-item-1`, `feature-item-1`),
because a GVL numbers purposes, special purposes, features and special
features independently and `purpose-item-1` used to stand for four
different rows at once. The Svelte preference centre listed every special
purpose and feature twice as a result; it no longer does.

`resolveIABBannerSummary` also exports the item cap it applies as
`IAB_BANNER_MAX_DISPLAY_ITEMS`, so a caller that wants to say how many
items were left out does not have to guess the number.

`resolveIABBannerSummary` takes an optional `maxItems`, so a caller with its own cap — `@c15t/svelte`'s `getIABBannerDisplayItems` — is honoured instead of silently ignored.
