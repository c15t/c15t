# V3 information architecture

The target structure for the v3 docs. Framework guides, shared concepts and
package bundles follow it. Record every moved route in
[v3-route-moves.md](v3-route-moves.md) so the docs host can redirect it.

## Navigation order

1. Getting started: Introduction (`/docs`), Choose your setup
   (`/docs/concepts/choose-your-setup`), Examples.
2. Frameworks, in selector order: Next.js, TanStack Start, React, Nuxt, Vue,
   Astro, Svelte, SvelteKit, HTML (script tag), JavaScript, React Native.
3. Concepts: How consent works, Consent categories, Policies, Data fetching,
   Consent state reference.
4. Verify and troubleshoot: Verify consent, Troubleshooting.
5. Customize.
6. Integrations.
7. Migrate to v3.
8. CLI.
9. Backend.
10. Comparisons and project pages.

`docs/docs.config.ts`, the framework index, shared framework tabs and
`scripts/docs-validation.test.ts` use the same framework order. The docs host
must list every framework slug in its selector, including `html`.

## Framework page set

Each framework directory contains its own pages. Share explanations through
`docs/shared/` partials; keep code and API names framework-specific. Framework
pages use navigation labels without the framework name, because the selector
already shows it. Put the framework in the `description`.

| Page | Slug | Required | Contents |
| --- | --- | --- | --- |
| Quickstart | `quickstart` | Yes | The recommended path only: install, backend URL, provider or module, stylesheet, scripts, preferences link, verification. Link to alternatives at the end. |
| Rendering and deployment | `rendering` | When there is more than one path | Decision table covering every supported path, each with its setup and an example app. Unsupported paths say so and name the alternative. |
| Components | `components` | Yes | Every exported component or element, its props or attributes, and what it renders. |
| Hooks, composables or client API | framework term | When exported | Reading consent, opening preferences, saving choices. Separate permission from recorded choice. |
| Customize | `customize` | Yes | This framework's shape for tokens, slots, copy and presentation, with links to the shared customization pages. |
| Scripts and embeds | `scripts` | Yes | Registering vendor scripts, gating embeds, network blocking and revocation for this framework. |
| Headless | `headless` | When exported | Custom markup with the adapter's headless API. |
| IAB TCF | `iab` | When supported | Components, stylesheet and server behavior for IAB policies. |
| Troubleshooting | `troubleshooting` | Yes | Symptom, check, fix. Framework-specific failures first, then link to the shared page. |

Next.js keeps its router pages (`app-router`, `pages-router`, `static-export`,
`client-side`) and deployment references (`geography-headers`,
`content-security-policy`, `optimization`, `api-reference/data-fetching`).
React and Next.js keep their per-component pages under `components/`.

## Shared pages

- `concepts/how-consent-works`: categories, policies, recorded choices versus
  permissions, notices, GPC, revocation. Plain words, no storage internals.
- `concepts/choose-your-setup`: one table from app shape to guide, then backend
  owner and rendering. Replaces `guides/deployment-modes`. When a framework
  layer adds a rendering page, point its rows there.
- `concepts/data-fetching`: manifest, `/init`, browser, offline and custom
  transports compared, as reference.
- `concepts/consent-categories` and `concepts/policies`: replace the
  per-framework concept duplicates under `next`, `react` and `javascript`.
- `guides/verify-consent` and `guides/troubleshooting`: the release checklist
  and symptom, check, fix. URLs unchanged.
- `concepts/consent-state`: save ordering, hydration, multi-tab sync, clears
  and storage conflicts. Reference only; framework bundles may omit it.

## Code in pages

Setup code comes from example regions (see the writing-docs skill). Every path
a page recommends has an example app or `next-compat` app behind it. Install
commands pin c15t packages to the `alpha` dist-tag until v3 is `latest`.

## Package bundles

Each framework package bundles its own framework directory, the concepts
pages, customization, and integrations. The umbrella `c15t` package bundles
every framework it exports. Cross-framework links in a bundle point to the
website.
