---
'c15t': patch
'@c15t/svelte': patch
'@c15t/astro': patch
---

Load `@c15t/iab` only when IAB is configured. `<ConsentManagerProvider>` no longer imports the TCF implementation statically, so a Svelte or SvelteKit app without an `iab` option no longer carries the CMP API in its layout chunk — 3.3 KB gzipped on the SvelteKit benchmark, and no `__tcfapi` bridge at all. The deferral is a new shared helper, `createLazyIABFactory()` from `c15t/runtime`, which both `@c15t/svelte` and `@c15t/astro` use; TCF surfaces wait for the module before rendering against the CMP handle. In `@c15t/astro`, the IAB dialog is also split out of the preference-centre island so only IAB sites download it.
