---
"@c15t/cli": patch
"@c15t/nextjs": patch
"@c15t/react": patch
"@c15t/ui": patch
---

feat(styles): ship explicit stylesheet entrypoints for prebuilt UI

- Publish explicit `styles.css` and `iab/styles.css` entrypoints for prebuilt UI in `@c15t/ui`, `@c15t/react`, and `@c15t/nextjs`
- Update docs and CLI setup so stylesheet imports and Tailwind host-app configuration are explicit
- Support the documented Tailwind 3 and Tailwind 4 layering model without requiring `!important`
