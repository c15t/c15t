---
"c15t": major
"@c15t/core": major
"@c15t/react": major
"@c15t/nextjs": major
"@c15t/backend": major
"@c15t/iab": major
"@c15t/node-sdk": major
"@c15t/dev-tools": major
"@c15t/translations": major
"@c15t/cli": major
"@c15t/ui": major
"@c15t/schema": major
"@c15t/logger": major
"@c15t/scripts": major
"@c15t/vue": minor
---

v3 is ESM-only. Every c15t package now ships a single ES module build: the
CommonJS artifacts (`dist/**/*.cjs`) and the `require` conditions in the
exports maps are gone, `main` points at the ESM entry, and the redundant
`module` field is removed. Exports entries follow the `types` / `import` /
`default` shape.

What breaks: `require('c15t')`, `require('@c15t/core')`, or any other
`require()` of these packages on Node.js older than 20.19 fails with
`ERR_REQUIRE_ESM`. Jest or Vitest setups that force a CommonJS resolution of
these packages, and legacy bundler configs that only read the removed CJS
targets, stop resolving.

What to do: consume the packages with `import` (all supported bundlers —
Next.js, Vite, webpack, Rspack — and modern Node.js handle this natively). On
Node.js 20.19+/22.12+, `require()` of these packages keeps working through
Node's `require(esm)` support via the `default` condition. If you are stuck on
an older Node.js with `require()`, stay on c15t v2, which continues to ship
CJS.
