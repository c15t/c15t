---
"@c15t/backend": patch
"@c15t/node-sdk": patch
"@c15t/cli": patch
"c15t": patch
"@c15t/dev-tools": patch
"@c15t/schema": patch
"@c15t/solid": patch
"@c15t/svelte": patch
"@c15t/vue": patch
"@c15t/react": patch
"@c15t/nextjs": patch
"@c15t/translations": patch
"@c15t/ui": patch
---

Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
