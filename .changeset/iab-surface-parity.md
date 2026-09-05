---
'@c15t/react': patch
'@c15t/svelte': patch
'@c15t/astro': patch
'@c15t/vue': patch
---

Bring the IAB banner and preference centre into line across adapters. The
IAB cards are plain elements carrying `role="dialog"` rather than native
`<dialog>` elements, which were adding the user agent's 1em padding on top
of the padding the card sets for itself. React's collapsed IAB purpose,
stack and vendor rows now actually collapse — they were opting out of the
shared collapse styles and reserving their content's full height while
closed. The Svelte IAB banner gets the backdrop its modal card implies,
its buttons emit the same variant attributes every other consent button
does, and the Svelte preference centre moves its content padding off the
collapsing container so a closed row measures zero.

The React and Astro banner backdrops are `aria-hidden`, and the Astro
banner announces itself as modal and takes focus like the others.
