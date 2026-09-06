---
'@c15t/core': patch
'@c15t/schema': patch
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/tanstack-start': patch
'@c15t/svelte': patch
---

Carry v3 policy resolutions, receipts, and privacy signals through streamed prefetch and cached manifest adapters. Capture the policy evidence when a choice is made so saves and retries retain that action's context. Prevent delayed prefetch from restoring cleared records, and forward identity and privacy record operations through the Next.js manifest boundary.

Document preset-based setup and migration from legacy policy fields and callbacks.

Preserve the full Accept-Language header during Svelte server prefetch, including explicit language overrides.

Allow empty React and Next.js providers to prerender with cache components enabled by deferring clock-dependent evaluation until initialization. Server-prepared receipts keep their supplied evaluation time.
