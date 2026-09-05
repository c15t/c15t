---
'c15t': minor
'@c15t/core': minor
'@c15t/svelte': minor
---

Add `@c15t/core/runtime`: `createConsentRuntime()` builds a consent kernel and wires persistence, script loading, network and iframe blocking, IAB, callbacks and `window.c15t` without a component tree. Construction is SSR-safe and hydrates stored consent before first paint; `start()` mounts the browser side effects and `dispose()` unwinds them. Hosts whose components cannot share context — an Astro page with several islands, a SvelteKit root layout — can now own one runtime and hand it around.

`<ConsentManagerProvider>` from `@c15t/svelte` is now a thin wrapper over that runtime and takes an optional `runtime` prop to render one it does not own. Its public API is unchanged.

Fixes a bug where the Svelte provider re-ran `identify()` and fired a second `init()` whenever any prop changed — passing a new inline `options={{ ...base, theme }}` object on a theme switch was enough. The reactive effects now key on the values they use.

The `c15t` umbrella mirrors the new entry as `c15t/runtime`.
