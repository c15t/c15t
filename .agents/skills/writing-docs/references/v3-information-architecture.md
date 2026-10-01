# V3 information architecture

The target structure for the v3 docs. Framework guides, shared concepts and
package bundles follow it. Record every moved route in
[v3-route-moves.md](v3-route-moves.md) so the docs host can redirect it.

## Navigation order

Root navigation groups, in this order. The docs host maps them to header tabs:
Docs, Frameworks, Integrations, Backend, CLI, Compare (`/docs/comparisons`)
and Changelog. Project and Legal pages belong in the footer.

1. Getting started: Introduction (`/docs`), Choose your setup
   (`/docs/concepts/choose-your-setup`), Examples, Migrate to v3.
2. Concepts: How consent works, Consent categories, Policies, Data fetching,
   Consent state reference.
3. Customization: the shared customization pages, then Banner experiments,
   which keeps its `/docs/guides/banner-experiments` route.
4. Verify and troubleshoot: Verify consent, Troubleshooting.
5. Frameworks, in selector order: Next.js, TanStack Start, React, Nuxt, Vue,
   Astro, Svelte, SvelteKit, HTML (script tag), JavaScript, React Native.
6. Integrations: Overview and Custom integrations, then the groups Vendor
   controls, Embeds, Tag managers, Analytics, Chat and support, Ads and pixels.
7. Backend: Overview, Quickstart, then the groups Guides and Reference.
8. CLI: Overview, Quickstart, Agents and automation, then the Commands group,
   which ends with Global flags.
9. Comparisons, Project and Legal.

Groups 1 to 4 come before Frameworks on purpose. Framework sidebars link some
shared pages, and leadtype resolves a page's active group to the first group
that lists it, so a shared page keeps its home group.

`docs/docs.config.ts`, the framework index, shared framework tabs and
`scripts/docs-validation.test.ts` use the same framework order. The docs host
must list every framework slug in its selector, including `html`.

## Framework sidebar

Every framework sidebar uses the same groups in the same order. Skip a group
the framework has no pages for, and never leave a group with fewer than two
pages. Page titles are the sidebar labels, so fix a title instead of adding a
label override. Titles leave out the framework name, because the selector
already shows it; put the framework in the `description`.

Link a shared page into a framework sidebar with a leading `/`, such as
`'/customization/recipes'`. It keeps its own route.

| Group | Pages, in order |
| --- | --- |
| No heading | Quickstart, setup variants (Next.js routers, HTML platforms), the install reference (Nuxt module, Vue plugin), Rendering and deployment |
| Scripts and embeds | Scripts, Embeds, Network blocker |
| Customization | Customize, Banner designs (`/customization/recipes`), Theme tokens (`/customization/tokens`), Translations, Compose your own banner where the adapter exports compound parts, Headless |
| Components | Components overview first, then one page per component |
| Consent API | The framework's term as the title (Hooks, Composables, Context getters, Client API, window.c15t API), then Callbacks |
| Advanced | IAB TCF, Geography headers, Content Security Policy, Performance, Server API, Transports, Islands, data-fetching reference, whichever the framework has |
| Reference | Only with two or more reference pages (HTML, JavaScript, Astro) |
| Verify and troubleshoot | DevTools, Troubleshooting, Verify consent (`/guides/verify-consent`) |

`scripts/docs-validation.test.ts` checks the group order, the two-page
minimum and that every framework page appears in its sidebar.

## Framework page set

| Page | Slug | Required | Contents |
| --- | --- | --- | --- |
| Quickstart | `quickstart` | Yes | The recommended path only: install, backend URL, provider or module, stylesheet, scripts, preferences link, verification. Link to alternatives at the end. |
| Rendering and deployment | `rendering` | When there is more than one path | Decision table covering every supported path, each with its setup and an example app. Unsupported paths say so and name the alternative. |
| Scripts | `scripts` | Yes | Registering vendor scripts, what happens when consent changes, clearing stored data and per-vendor switches. |
| Embeds | `embeds` | Yes | Gating iframes with the adapter's gate component and the iframe blocker. |
| Network blocker | `network-blocker` | Yes | Rules, what a blocked request looks like, when blocking starts and what it cannot stop. |
| Customize | `customize` | Yes | This framework's shape for tokens, slots, copy and presentation, with links to the shared customization pages. |
| Translations | `translations` | Yes | Default language, custom copy, adding languages and how the language is picked. |
| Compose your own banner | `compose` | When compound parts are exported | Compound parts and `asChild`. Svelte and SvelteKit use `components/primitives`. |
| Headless | `headless` | When exported | Custom markup with the adapter's headless API. |
| Components | `components` | Yes | Overview of every exported component or element, linking one page per component under `components/`. |
| Hooks, composables or client API | framework term | When exported | Reading consent, opening preferences, saving choices. Separate permission from recorded choice. |
| Callbacks | `callbacks` | Yes | Every callback, when it fires, its argument and where to register it. |
| IAB TCF | `iab` | When supported | Components, stylesheet and server behavior for IAB policies. |
| Troubleshooting | `troubleshooting` | Yes | Symptom, check, fix. Framework-specific failures first, then link to the shared page. |

Next.js keeps its router pages (`app-router`, `pages-router`,
`static-export`, `client-side`) and Advanced pages (`geography-headers`,
`content-security-policy`, `optimization` titled Performance, and
`data-fetching-reference`).

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
