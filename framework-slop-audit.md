Framework cleanup on `origin/v3`, September 9, 2026.

All nine findings from the follow-up audit are addressed alongside the earlier cleanup.

| Finding | Fix |
| --- | --- |
| Two GVL caches disagreed about freshness | The server adapter now uses the transport cache implementation. Both honor `no-store`, `no-cache`, `private`, explicit zero lifetimes, and upstream `Age`. They prefer `s-maxage` over `max-age`, with a five-second fallback. A cleared cache cannot be repopulated by an old pending fill. Regression tests exercise both entrypoints, including 204 responses. |
| Next.js downloaded the GVL on every eligible init | Its default fetcher now uses the shared GVL cache. A request-level regression test checks that repeated IAB init requests fetch the list once. The custom `fetchGvl` option remains supported. |
| Copied static generators had different validation | Core supplies shared fetch and generation helpers. Both framework adapters validate export names and import sources. Next.js emits its type import from its own static entrypoint and supports `importSource` for umbrella installations. Each framework keeps its existing policy-resolution behavior. |
| React/Svelte tests could pass without saving consent | Required controls now fail when missing. Dialog-save and complete-flow tests assert the saved marketing value. The React IAB listener-removal test uses a second active listener to prove an event occurred, then checks that the removed listener received nothing. Its fixed sleep is gone. |
| TanStack's type regression test was excluded from compilation | Moved the serializability assertion into a dedicated compiler target and wired it into `check-types`. Removed the redundant runtime function-existence assertion. |
| Nuxt wrapped an uncached route in cache infrastructure | Replaced the always-bypassed cache handler with a plain event handler. Removed the cache-handler dependency, type, name, and unused vary-header configuration. |
| Vue/Nuxt duplicated route-default helpers | The server module re-exports the canonical route helpers and aliases the cache-clear export. Existing import paths remain available. |
| Next.js and core parsed cache lifetimes differently | Next.js delegates to core's parser. Both accept nonnegative integer directives and reject trailing junk, fractions, exponent notation, and unsafe integers. |
| Svelte retained an unused logo | Deleted the full-logo component with no callers or public export. Also removed the unused internal default alias for Portal; its named export remains. |

The Knip configuration now includes Vue and Astro source formats, injected routes, Nuxt components, public runtime compatibility paths, and Svelte Kit/CSS entrypoints. Public files initially reported as unused were preserved.

Changed runtime behavior is documented in the Next.js server guide and recorded in `.changeset/vast-meals-act.md`. The five-second GVL fallback replaces the transport cache's previous one-day assumption when the backend sends no lifetime. The common implementation retains stale-list fallback after unsuccessful HTTP responses; responses forbidden from reuse never enter that fallback cache.

Validation completed during implementation:

- 43 focused core cache tests passed.
- 30 focused React browser tests and 17 Svelte tests passed with the stronger assertions.
- 25 Next.js API/static tests, 29 TanStack server/static tests, and 20 Vue server-route tests passed.
- The affected package builds and typechecks passed, including TanStack's new compiler test.
- The changed documentation passed remark.

Final validation:

- The full package suite passed with coverage enabled: 5,395 tests passed; the backend retains 26 existing skips.
- All package typechecks passed, including the React, UI, and TanStack compiler tests.
- All 135 root tooling tests passed.
- Full repository lint, canonical test-ID checks, changed-file formatting, and `git diff --check` passed.
- Knip found no unused files or exports in core, React, Vue, Astro, Svelte, Next.js, or TanStack.
- The publish artifact guard passed for all 18 packages.
