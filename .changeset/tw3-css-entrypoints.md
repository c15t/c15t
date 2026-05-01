---
"@c15t/ui": patch
"@c15t/react": patch
"@c15t/nextjs": patch
---

Fix Tailwind CSS v3 stylesheet packaging so package resolvers that do not follow nested CSS imports still include the generated c15t component rules.

Root `styles.tw3.css` and `iab/styles.tw3.css` proxy entrypoints are now published, and the React/Next.js Tailwind v3 dist stylesheets inline the generated UI CSS instead of forwarding through nested package imports.
