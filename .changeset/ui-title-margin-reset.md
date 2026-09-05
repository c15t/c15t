---
'@c15t/ui': patch
---

The banner and dialog titles no longer inherit the user agent's heading
margins.

React renders both titles as `<h2>` for the heading semantics; Svelte, Vue
and Astro render `<div role="heading" aria-level="2">`. The shared `.title`
rules set no `margin`, so the `<h2>` kept the browser default — 13.28px
above and below on the banner, 11.62px on the dialog — and the same
component came out 26px taller in React than everywhere else (banner card
442x217 against 442x191, dialog card 448x533 against 448x510).

The rules now reset `margin` the way the accordion, preference-item and
IAB title rules already do. React keeps its `<h2>`.
