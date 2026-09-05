---
'@c15t/react': patch
'@c15t/svelte': patch
'@c15t/astro': patch
'@c15t/vue': patch
'@c15t/ui': patch
---

Render the same DOM for the same surface across adapters. Every banner
and dialog title is now an `<h2>` rather than a `<div role="heading">`;
the branding tag wraps its content in the `tag.content` slot everywhere
and no longer pins the whole tag to LTR in Svelte and Astro, so the
"Secured by" copy follows the page direction as it already did in React;
and the accordion trigger's `data-testid` names the button rather than
the row that holds it.

In React, `consent-dialog-root` now names the panel wrapper — the element
that carries the dialog role, the focus trap and the label — instead of
the positioning shell around it, matching every other adapter. The dialog
backdrop follows the root's `open` prop, so a dialog opened directly
rather than through the consent manager fades its backdrop in instead of
leaving it hidden.
