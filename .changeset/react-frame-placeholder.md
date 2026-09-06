---
'@c15t/react': patch
'@c15t/svelte': patch
---

Give the React frame placeholder the `frame-placeholder` and
`frame-open-dialog` slots the Svelte one has, so a blocked embed can be
found and styled the same way in both. Its button opens the preference
dialog rather than granting the category outright, and its label now
substitutes the translated category title instead of the raw category
key. The Svelte frame's button goes through the shared `ConsentButton`,
so both render the same markup.
