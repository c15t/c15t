# c15t

> Umbrella package for the c15t consent management platform: one install that provides the headless consent engine, the React components, and the Next.js integration.

`c15t` is a facade over the scoped packages. Every subpath re-exports the matching scoped subpath one-to-one:

| Import from | Mirrors | Use for |
| --- | --- | --- |
| `c15t`, `c15t/v3`, `c15t/v3/*` | `@c15t/core` | Headless consent engine: storage, script gating, callbacks |
| `c15t/react`, `c15t/react/*` | `@c15t/react` | Cookie banner, consent dialog, preference center, hooks, primitives, CSS |
| `c15t/next`, `c15t/next/*` | `@c15t/nextjs` | Next.js App Router and Pages Router integration, SSR |

So `c15t/react/hooks` is exactly `@c15t/react/hooks`, `c15t/react/styles.css` is exactly `@c15t/react/styles.css`, and `c15t/next` is exactly `@c15t/nextjs`. The scoped packages stay published and permanently supported — code written against them needs no changes, and this package pins them to exact matching versions.

## Documentation

This package intentionally ships no docs of its own. The full documentation is bundled with the scoped packages installed alongside it — read it offline from `node_modules`:

- `node_modules/@c15t/core/AGENTS.md` + `node_modules/@c15t/core/docs/` — headless engine, client modes, script loading, integrations
- `node_modules/@c15t/react/AGENTS.md` + `node_modules/@c15t/react/docs/` — React components, theming, hooks
- `node_modules/@c15t/nextjs/AGENTS.md` + `node_modules/@c15t/nextjs/docs/` — Next.js setup, SSR, middleware

Substitute the umbrella subpath when applying those docs (`@c15t/react/…` → `c15t/react/…`, `@c15t/nextjs/…` → `c15t/next/…`, `@c15t/core` → `c15t`). Online docs: <https://c15t.com/docs>.
