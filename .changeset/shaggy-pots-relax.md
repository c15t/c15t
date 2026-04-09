---
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/cli': patch
---

Align the styled package install path around app-level CSS entrypoints instead of JS-side stylesheet imports.

- `@c15t/react`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/react/styles.css` or `styles.tw3.css` from a global CSS file, with explicit guidance on why this avoids layer-order debugging problems.
- `@c15t/nextjs`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/nextjs/styles.css` or `styles.tw3.css` from `app/globals.css`, with explicit guidance on why this avoids layer-order debugging problems.
- `@c15t/cli`: move the stylesheet codemod and scaffold behavior to mutate global CSS entrypoints, remove old JS-side stylesheet imports, share the CSS-entrypoint mutation logic between generate and codemod flows, and add regression coverage for Tailwind v3/v4, IAB, dry-run, and missing-CSS cases.
