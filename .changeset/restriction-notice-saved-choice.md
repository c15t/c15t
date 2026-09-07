---
'@c15t/react': patch
'@c15t/svelte': patch
'@c15t/ui': patch
---

Show the "your saved choice is restricted" notice in the preference center only when a saved grant is actually overridden by the current policy or a privacy signal such as Global Privacy Control. Toggling a category in the draft no longer triggers it, and the notice now renders below the category row instead of inside it, where it used to overlap the title. The notice carries `data-testid="consent-widget-restriction-<category>"` in React as it already did in Svelte.
