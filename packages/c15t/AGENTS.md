# c15t

> Umbrella package for the c15t consent management platform: one install that provides the headless consent engine, the React components, the Next.js integration, and the Vue/Nuxt module.

`c15t` is a facade over the scoped packages. Every entry point re-exports the matching scoped package one-to-one:

| Import from | Mirrors | Use for |
| --- | --- | --- |
| `c15t` (root) | `@c15t/core` | Headless consent engine: storage, script gating, callbacks |
| `c15t/react` | `@c15t/react` | Cookie banner, consent dialog, preference center, hooks, primitives, CSS |
| `c15t/next` | `@c15t/nextjs` | Next.js App Router and Pages Router integration, SSR |
| `c15t/vue` | `@c15t/vue` | Vue integration and the Nuxt module |

Every subpath carries over: `c15t/react/hooks` is exactly `@c15t/react/hooks`, `c15t/react/styles.css` is exactly `@c15t/react/styles.css`, and `c15t/next` is exactly `@c15t/nextjs`. The scoped packages stay published and permanently supported — code written against them needs no changes, and this package pins them to exact matching versions.

## Documentation

This package intentionally ships no docs of its own. The full documentation is bundled with the scoped packages that installing `c15t` guarantees are present in `node_modules` — read it offline from there, version-matched to the installed code:

- `node_modules/@c15t/core/AGENTS.md` + `node_modules/@c15t/core/docs/` — headless engine, client modes, script loading, integrations
- `node_modules/@c15t/react/AGENTS.md` + `node_modules/@c15t/react/docs/` — React components, theming, hooks
- `node_modules/@c15t/nextjs/AGENTS.md` + `node_modules/@c15t/nextjs/docs/` — Next.js setup, SSR, script loading
- `@c15t/vue` bundles no docs yet — for Vue/Nuxt, use <https://c15t.com/docs>

Those docs already write imports against the umbrella subpaths (`c15t`, `c15t/react`, `c15t/next`), so their code samples apply to this package unchanged. Only substitute the scoped names (`@c15t/core`, `@c15t/react/…`, `@c15t/nextjs/…`) when a project installs the scoped packages directly instead of the umbrella. Online docs: <https://c15t.com/docs>.
