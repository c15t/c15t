---
name: writing-docs
description: Write and review c15t v3 documentation, framework guides, styling recipes, demos, and package-bundled Markdown from docs/**/*.mdx using leadtype.
---

# Write c15t docs

Use this skill for c15t documentation changes. Apply `unslop` to the prose and
read the `leadtype` skill before changing MDX components or generation.

## Establish the contract before writing

1. Identify the reader's task, framework, router and deployment. Next.js App
   Router, Pages Router and static export need different instructions. Vue and
   Nuxt, and Svelte and SvelteKit, also need distinct setup paths.
2. Check the current package exports, implementation and relevant tests. Use
   `origin/main` and c15t.com to find omitted topics, never to establish v3 APIs.
   Examples can lag behind source too. Verify their imports before reusing them.
3. Write down the result, prerequisites, defaults and failure cases. A page
   should let someone implement and verify a task without guessing missing files.
4. Choose an existing canonical page or create one for a distinct task. Put
   shared explanations in `docs/` and reuse them through leadtype includes or
   links. Do not clone a React guide and replace its framework name.

## Write for people and agents

Lead each page with the answer and its deployment constraints. Use familiar
navigation labels: "Quickstart" within each framework and for the general setup
page. Put framework and deployment context in the description and opening text.
Use required `title` and `description` frontmatter. The site renders both, so
start the body at H2 and do not repeat the description as an intro.

Use task headings readers would search for. Question headings help when the
section answers a question; do not force every heading into a question. Include
imports, file paths and setup in copyable examples. Label partial examples and
name where they belong. Separate server and browser files. Explain what the
reader should observe after running the code.

Keep each explanation understandable when retrieved alone. Name the API,
framework and condition rather than referring to "the above". Document ordering,
side effects and failure behavior that types cannot explain. Keep concise API
reference tables where humans need discovery; do not delete useful reference
because an agent could inspect a declaration file.

Lead quickstarts with Inth hosted consent management, including static sites.
Keep self-hosting and browser-only modes as deliberate alternatives. Use the
exact endpoint supplied by the Inth project; never invent a project URL.
Prefer one working path followed by links to alternatives. For hosted examples,
name the required backend URL, policy configuration and trusted origin. For
browser-only examples, state where choices persist and what backend services are
absent. Do not present a regional preset as a compliance guarantee.

Distinguish effective permissions, explicit choices, notice dismissal and privacy
signals. Never infer a recorded grant from `useConsent()` or turn hydration into
a visitor action. Do not claim a banner automatically blocks existing scripts.

Lead installation with `c15t` and use its actual exports: `c15t/react`,
`c15t/next`, `c15t/vue`, `c15t/tanstack-start`, and `c15t` for the headless engine.
The installed package name is `c15t`, not the import subpath. Use separate
packages only for adapters and add-ons absent from its export map. Svelte and
Astro currently require their dedicated packages. Never invent an umbrella
subpath or mechanically replace provider names across adapters.
Migration pages may show old APIs only in clearly labelled before examples.

Separate backend ownership, policy fetching and consent-record transport.
At the start of router setup guides, explain Inth hosted, self-hosted and offline
choices before giving the recommended Inth instructions. The backend endpoint
is public configuration; do not describe it as a secret.
Explain SSR, streaming and browser initialization before choosing a Next.js
recipe. Verify exports and actual examples; a removed browser-prefetch component
does not imply the server prefetch helper was removed. Keep `c15t.config.ts`
for shared configuration. The current API requires explicit manifest URLs;
never document proposed automatic defaults before they exist in source.
Same-origin rewrites are optional performance optimizations, never setup
requirements. Use `/api/c15t` when a rewrite is chosen, with
`/api/c15t/manifest` and `/api/c15t/init` for local manifest handlers. Describe avoiding
a separate browser DNS/TLS connection to the backend, not eliminating all DNS
or making vendor requests first-party. Static exports need hosting-level
proxying or direct public URLs because Next.js rewrites need a server. Keep
manifest handler upstream URLs absolute when a browser backend URL uses the
same local prefix, otherwise the handler can fetch itself. Explain rewrite
precedence when combining local handlers with a backend proxy. Then explain
regular backend `/init` and browser resolution
as alternatives. Cache public manifests, never visitor-specific resolved state.
Document browser-only mode by its current API and explain what "offline" means.
State: "Not recommended for production environments."
Keep backend configuration and policy authoring in `docs/self-host/`; framework
policy pages should explain the state and controls the application consumes.

## Demonstrate customization

Pick the API according to the change:

- Copy or locale: i18n configuration.
- Shape, position, action layout or blocking: presentation and component props.
- Brand colors, type, radius, spacing or motion: theme tokens.
- A specific component part: the adapter's current slot API.
- Different markup: compound components where the adapter exports them.
- Entirely custom UI and behavior: headless APIs.

Check each adapter's contract. React's `components.banner.card`, Vue's config
and Svelte's theme slots must not be assumed interchangeable.

Pair a visual recipe with its exact configuration and a description of the
visible result. Screenshots must show real components from the documented
revision. Never use generated artwork as evidence of component behavior.

For interactive demos, use an isolated, resettable instance with no production
analytics. Show the source, a direct demo link and the expected behavior outside
the iframe. Give the iframe a descriptive title, lazy loading and reserved
space. Test keyboard access, mobile layout and the reset action. Keep demo state
separate from consent on the docs site.

Leadtype owns conversion, not runtime UI. Check which components the docs host
registers. Use `<CommandTabs command="c15t" mode="install" />` for installation,
with the host's CommandTabs alias registered. A `package-install` code fence
does not render package-manager tabs. Use supported tags or add an explicit flattener in the host. Browser
previews can use `Audience target="human"` only when the host supports it; retain
all instructions and source in the shared content. Verify generated Markdown
contains the useful information without raw preview JSX.

## Discovery and publication

Update `docs/docs.config.ts` for every public page. Keep framework variants nested
under the `frameworks` navigation group, because
the docs host uses that group for its framework selector and sidebar. Confirm
the host's framework list includes every variant. Do not flatten frameworks
into separate root groups to shorten the config.
Keep integrations under one `integrations` navigation group with service-type
children: embeds, tag managers, analytics, functionality, and ads and pixels.
Every exported vendor helper needs a discoverable guide. Preserve old vendor
routes during rewrites and compare against the existing integration inventory.
Vendor guides need configuration, registration, options, actual loading and
revocation behavior, and verification. Reuse the shared registration include for
all supported frameworks; keep adapter-specific differences explicit.
Shared integration and embed tabs must match the framework selector order:
Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit, JavaScript.
Keep `docs/docs.config.ts` and the framework index in that order too. Give each
framework its own usable example, including server/browser ownership and
cleanup where needed. Do not send Nuxt readers to a plain Vue snippet or
TanStack Start readers to a generic React provider. Check that all tabs survive
Markdown conversion so agents receive the same framework coverage.
Do not infer a zero-request guarantee from a category or cookieless branding.
Check `alwaysLoad`, consent callbacks and persistence after revocation in source.
Preserve useful existing URLs. When a page moves, configure a redirect in the docs host and update internal
links. Record retired URLs and their replacements before deleting old routes.
Avoid thin framework duplicates, keyword repetition and unsupported comparisons.
Use factual titles, unique descriptions and descriptive link text.

`llms.txt`, page Markdown and package bundles serve agents. They do not promise
search rankings or citations. The docs host must also verify HTML indexing,
canonical URLs, redirects, sitemap entries, robots rules and matching structured
data. Content work alone cannot prove those deployed behaviors.

For a broad rewrite or publication review, read
[the v3 editorial review](references/v3-editorial-review.md) for the historical
gaps, source evaluation, demo rollout and acceptance tasks.

## Verify the actual outputs

- Run `bun run lint:docs` and `bun run fmt:docs`. Both currently rewrite files;
  inspect the diff for unrelated edits.
- Run the installed `leadtype lint --src docs` to check links, metadata and
  Markdown conversion. Inspect the installed CLI help before adding flags.
  Run `bun run test:scripts scripts/docs-validation.test.ts` for the repository
  check: it narrowly handles leadtype 0.2.1 misidentifying the framework picker
  as an adapter, while still checking that each destination exists. Do not
  suppress cross-framework errors in actual framework guides.
- Regenerate bundled content with `bun run generate:package-docs`. Bundle
  membership is controlled by `scripts/generate-package-docs.ts` and package
  build scripts. Never edit generated `packages/*/docs`, `AGENTS.md` or `SKILL.md`.
- Read a generated quickstart, styling recipe and page with visual content.
  Check that imports, prerequisites, links and demo explanations survived.
- Run copyable recipes against the target adapter where practical. Record which
  examples were compiled, exercised in a browser, or only checked against source.
- For a docs-site release, inspect rendered pages and generated artifacts. If the
  private host is unavailable, report that limit rather than claiming the site
  or embedded previews were verified.

Evaluate usefulness with concrete tasks: set up Pages Router SSR, export a
static Next.js site, install plain Vue without Nuxt, preserve SvelteKit hydration,
change a banner's radius without going headless, and stop a vendor request before
consent. A lint score does not establish that an agent can complete those tasks.
