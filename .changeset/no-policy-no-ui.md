---
'c15t': minor
'@c15t/react': minor
'@c15t/nextjs': minor
'@c15t/vue': minor
'@c15t/svelte': minor
'@c15t/astro': minor
---

No consent UI renders while no policy rule has resolved. When resolution
fails, no rule matches and the host set no default, or init is still
withheld, the banner, preferences dialog, widget, preferences link, dialog
trigger, and the toolbar's built-in preferences action all render nothing.
App-owned toolbar actions still render. Surfaces appear as soon as a rule
resolves, without a remount. A rule with `prompt: 'none'` is different: it
has a resolved model, so the trigger stays as the route to preferences.
Headless hosts can read the same signal from `useModel()`, which returns
`null` until a rule resolves.
