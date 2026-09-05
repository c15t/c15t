---
'@c15t/vue': patch
'@c15t/ui': patch
'@c15t/react': patch
---

Bring the Vue consent surfaces onto the same boxes as React, Svelte and
Astro. Vue's buttons were 4px taller and 8px wider because its
`ConsentButton` never emitted `data-size`; it now takes a `size` prop and
defaults to `small` like the React primitive. Its footer wrapped the
actions in an extra element where the other adapters make the footer
itself the action root, and it fell back to one group holding every
action rather than the shared default layout — reject and accept
together, customize on its own. The branding tag was missing its base and
variant classes, so it rendered at the wrong weight and line height.

The Vue dialog now puts the dialog role, label, description, direction
and focus target on the panel wrapper the `consent-dialog-root` testid
names, its description takes its class from the dialog stylesheet rather
than the banner's, and the category accordion trigger is a real `button`
rather than a `div` with `role="button"`.

Two shared-style fixes go with it: the accordion trigger and the
preference-item trigger inherit their font, so category titles no longer
render in the user agent's button font.
