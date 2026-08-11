---
'@c15t/cli': minor
---

The CLI now scaffolds the `c15t` umbrella package. Setup installs the single `c15t` dependency for JavaScript, React, and Next.js projects; generated code imports from `c15t`, `c15t/react`, or `c15t/next` depending on the detected framework; and stylesheet imports use `c15t/react/styles.css` / `c15t/next/styles.css` (including the `.tw3` and IAB variants). Re-running setup on an app that previously used scoped stylesheet imports normalizes them to the umbrella path. Codemods still recognize existing `@c15t/react` / `@c15t/nextjs` imports, and `@c15t/backend`, `@c15t/scripts`, and `@c15t/dev-tools` are installed directly as before.
