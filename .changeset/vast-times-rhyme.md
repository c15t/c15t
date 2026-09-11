---
"@c15t/core": minor
"c15t": minor
"@c15t/react": minor
"@c15t/nextjs": minor
"@c15t/tanstack-start": minor
"@c15t/vue": minor
"@c15t/svelte": minor
"@c15t/astro": minor
"@c15t/scripts": patch
---

Add `clearOnRevocation` to remove configured first-party cookies, localStorage,
and sessionStorage entries when their category loses permission. Apply the same
cleanup at startup for denied categories after policy resolution, with shared
behavior across framework adapters and a standalone core module for headless use.
Support exact names, prefix patterns, and explicit cookie scopes while preserving
c15t's consent records.

Document cleanup configuration and browser limits in the bundled integration guide.
