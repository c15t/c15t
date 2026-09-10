# V3 editorial review

Reviewed 10 September 2026 against the current worktree, `origin/main` and the
published site. This is an authoring reference, not a public product guide.

## Preview follow-up

The local c15t-docs preview exposed a navigation mismatch: the host expects one
`frameworks` group with framework children. The source now retains that hierarchy
and uses concise "Quickstart" page labels. Setup guides install `c15t` and use
verified umbrella exports wherever available. Svelte, Astro and separate add-ons
retain their own packages.

Install blocks use Leadtype's `CommandTabs` component. The current docs host must
alias it to its existing `PackageCommandTabs` renderer and include all nine
frameworks in both `frameworkOrder` and the shared framework registry. The companion
[host patch](docs-host-v3.patch) records these local host changes and their registry
regression test. Apply it in
the docs-site monorepo when updating the pinned content revision. Those runtime
files are outside this package repository.

The checks below record the original rewrite. Follow-up regression tests also
check the resolved framework hierarchy, command-table Markdown, and umbrella
imports against the package export map.

## What the old docs missed

The old tree contains 260 files under `docs/`. Its Next.js quickstart starts
with App Router and sends rendering alternatives elsewhere. Before this rewrite,
the reduced tree kept only three framework routes despite native Vue/Nuxt, Svelte/SvelteKit,
Astro and TanStack Start implementations. Do not treat Solid's primitive
re-exports as a full provider integration.

The old docs contain valuable styling depth, including tokens, slots, CSS
variables, Tailwind, color schemes and internationalization. The problem is
finding and choosing those tools, not simply adding more API lists. Restore
that depth with a customization decision guide and concrete recipes.

The quickstarts verify banner visibility and persistence but do not establish
that vendor requests are actually blocked. New installation paths need network
and lifecycle checks. Development-only geography overrides in copied examples
can also escape into production; keep them in a labelled testing section.

The reduced navigation preserves v2 names such as consent-manager-provider while
some v3 adapters use ConsentProvider. Keep existing URLs where useful, but use
the actual exported name in page titles and examples. The previous bundle script
only covered core, React, Next.js, backend, scripts and CLI. New framework docs
need corresponding package publication work to become available offline.

## Evaluate the writing guides

[Mintlify's GEO guide](https://www.mintlify.com/docs/guides/geo) is useful for
answer-first prose, explicit terms, descriptive metadata and real-question
checks. Its product configuration is Mintlify-specific. Claims about faster
indexing and predictable AI citation behavior do not establish a guarantee for
c15t. Do not copy those claims into our writing rules.

[Leadtype's agent-writing guide](https://leadtype.dev/docs/writing/write-for-agents)
usefully prioritizes defaults, failures and ordering constraints, and explains
how to preserve content through Markdown conversion. Its evaluation results
concern its own fixtures. They do not prove that all API reference is redundant,
that every agent has our types in context, or that question headings guarantee
retrieval. Keep task-oriented reference for human readers too.

[Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features)
says ordinary SEO foundations apply and does not require special AI text files
or schema. Distinguish discoverability in Google from usability in an IDE agent.
Use leadtype artifacts for the latter and verify the host's technical SEO for
the former. Measure correct answers and successful integrations, not just mentions.

## Content coverage

The public navigation should make these tasks findable:

- Choose framework, rendering mode and backend ownership before installation.
- Install React, Next.js App Router, Pages Router or static export, Vue, Nuxt,
  Svelte, SvelteKit, Astro and TanStack Start with their actual adapter APIs.
- Understand policy resolution, effective permissions, recorded choices,
  notice dismissal, GPC, storage, expiry and backend failures.
- Gate scripts and embeds, remove duplicate vendor loaders, handle revocation
  and navigation, and verify Google Consent Mode behavior per integration.
- Customize presentation, tokens, slots, copy, locales and fully custom markup.
- Configure and operate a backend, migrate v2 records and inspect errors.

Keep legal templates and open-source policy pages separate from implementation
navigation. Do not rewrite legal obligations from API behavior.

## Visual and demo rollout

Use actual v3 components for the visual gallery. Start with a floating card,
full-width bar, widget, choice wall, preference dialog and consent-gated embed.
Include light and dark themes, long translations and narrow viewports. Each
recipe needs source code and a named expected result.

The docs host lives in a private template and is not present in this checkout.
Before enabling public iframes, establish a versioned preview URL from the
existing Storybook apps or a dedicated example route. Never point v3 docs at an
unverified v2 deployment. The embed should expose reset, keyboard interaction,
source and a direct link. Keep demos free of real third-party tracking.

Preserve the setup and explanation in Markdown. A screenshot or iframe alone
cannot teach an agent which token or slot produced the result. Avoid loading
many live frames at once; show a static preview until the reader opens a demo.

The initial gallery now lives in `apps/storybook-react/src/docs-recipes.stories.tsx`.
It imports `docs/examples/brand-theme.ts`, also included in the public recipe.
The iframe paths on a matching Storybook deployment are:

- `/iframe.html?id=docs-customization--brand-card&viewMode=story`
- `/iframe.html?id=docs-customization--brand-bar&viewMode=story`
- `/iframe.html?id=docs-customization--choice-wall&viewMode=story`

Reserve at least 500 pixels of height for the card and bar; allow more height
for the open preferences dialog and narrow screens. Give each iframe a title,
lazy-load it, and retain a direct link and source outside the frame. Register
the host's preview component and its Markdown flattener before adding it to MDX.
The local screenshots are ready; these paths are not public deployment URLs.

## Validation recorded for this rewrite

- Leadtype generated 84 site pages and the Markdown indexes and sitemap.
- All 11 package bundles generated; 298 Markdown pages and agent indexes had
  no missing local link or image destinations. A Vue package dry run included
  its new guides, index and screenshots.
- Twenty-two self-contained TypeScript examples compiled against built v3
  packages. Adapter package builds passed. This does not establish that every
  complete framework application has been tested in SSR and static production.
- The React gallery passed reject, reopen preferences, Escape and reset checks.
  The 375-pixel viewport had no horizontal overflow. Five screenshots came from
  the actual components after their transitions completed.
- Six targeted repository tests cover docs validation, offline link rewriting
  and include restoration. The writing skill passed its structural validator.

Leadtype 0.2.1 has two observed limitations handled in repository tooling.
Its linter mistakes the framework index for an adapter; the test permits only
the index's existing framework destinations. Its filtered bundle mirror omits
include dependencies; the generator reconverts affected pages from their original
source through leadtype and rejects remaining conversion errors. Keep the
regression checks when upgrading leadtype.

The local docs host now renders the corrected framework navigation and install
tabs. Public iframe embedding, old-route redirects and deployed SEO remain
release acceptance work.
Check index-page Markdown URLs specifically: leadtype emits a curated link to
`/docs/frameworks.md`, while the generated file is `docs/frameworks/index.md`.
The host must resolve that route or publish the appropriate alias. A successful
CLI generation does not prove that the public Markdown route exists.

## Integration coverage

All 38 v2 integration routes are retained in v3, including the overview and
custom-integration guide. The navigation restores service-type groups instead
of a flat shortlist. The scripts package currently exposes 34 named vendor
helpers; each has a guide. Google Maps and YouTube have framework-specific consent-gated embeds because
the old convenience components are absent from the v3 adapters.

Guides distinguish initial permission gating, vendor consent signals, and
post-load cleanup. Shared registration and embed instructions cover all nine frameworks in the
selector order. Each adapter uses its own runtime and cleanup API.
The route inventory excludes the 31 restored integration URLs, which no longer
need redirects.

Validation for the restored integrations:

- All 38 original routes exist; every exported vendor helper appears in grouped
  navigation. Browser requests returned HTTP 200 for all 38 routes.
- The preview renders framework registration tabs and all five integration
  sidebar groups. Development navigation now refreshes after leadtype generation.
- Forty-one self-contained integration snippets compiled, and all 34 documented
  vendor configurations constructed against the current source. Root tooling
  passed 146 tests. These checks do not verify delivery into customer dashboards.

## Framework coverage, backend and fetching follow-up

Shared integration examples now follow the nine-framework selector order. The
rendered PostHog, YouTube and Maps pages expose every example on desktop and at
375 pixels without page overflow. The browser embed helper passed permission,
revocation and cleanup checks; Astro startup and navigation preserve one mount.

The backend section contains 12 pages, including restored policy, caching,
deployment, IAB, logging and legal-document workflows. Next.js server guides lead
with cached manifests and a local init route while consent writes remain on
Inth through a same-origin rewrite. The shared file is `c15t.config.ts`; router
guides explain Inth, self-hosting and offline before setup. The v3 optimization
guide restores the old route without carrying over v2 benchmark figures.
The data-fetching guides compare this with regular backend `/init`, browser
manifest resolution and offline operation. Frontend policy pages now explain
observable behavior and link to backend policy authoring.

Validation: 148 root tooling tests passed. Twenty-two fetching examples, 12
backend examples, three policy diagnostics and two TanStack examples type-check.
Thirteen shared examples passed TypeScript or Vue/Svelte compiler checks. Backend
runtime checks covered manifest caching/ETags, init and legal snapshot signing.
These checks do not replace production deployments or customer-vendor testing.

## Release acceptance

1. Every navigation route resolves; every removed old route has a reviewed
   redirect destination or an intentional removal decision. Inspect `origin/main`
   for the complete inventory, including shared pages and old framework routes.
   The [v2 route inventory](v2-route-inventory.md) records 107 absent public MDX
   paths, including older hooks and CLI commands. It lists comparison targets
   where available; it is not a blanket redirect map or a claim of v2 coverage.
2. Installation examples compile against the v3 packages being published.
   Exercise request SSR and static output separately; a dev server masks missing
   static API routes. Confirm absent consent, reject, accept, partial save,
   reload, navigation, revocation and unavailable backend behavior.
3. Package tarballs include the appropriate Markdown and an index whose links
   work offline. New adapter bundles require package `files` and build wiring,
   not only a new include glob.
4. Render the private docs host with this revision. Confirm images, demos,
   mobile layout, keyboard controls, heading anchors and copy buttons.
5. Verify deployed HTML, canonical URLs, sitemap, redirects, robots and metadata.
   Fetch Markdown mirrors and indexes separately. Do not change crawler access
   indiscriminately; decide which search and agent clients the site intends to serve.
6. Record real question evaluations and failures. Repeat them after changes to
   imports, provider ownership, policy defaults, theming or framework routing.
