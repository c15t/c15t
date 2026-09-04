---
name: writing-docs
description: |
  Author or edit c15t documentation in docs/**/*.mdx — the source for both the
  c15t.com site and the docs bundled into published packages. Use when writing
  guides, integration pages, reference docs, changing package-bundled docs
  (packages/*/docs, packages/*/AGENTS.md), or fixing docs lint failures.
---

# Writing c15t Docs

`docs/` is the single source of truth for two outputs:

1. **c15t.com** — the docs site app is private and maintainer-only. External contributors only edit MDX and preview via the PR docs-preview action.
2. **Package-bundled docs** — `scripts/generate-package-docs.ts` compiles subsets of `docs/` into a `docs/` folder and `AGENTS.md` for six packages (`c15t`, `@c15t/react`, `@c15t/nextjs`, `@c15t/backend`, `@c15t/scripts`, `@c15t/cli`), which ship in their npm tarballs.

Never edit `packages/*/docs/**` or `packages/*/AGENTS.md` directly — they are generated. Edit the MDX source, then regenerate with `bun run generate:package-docs` (or `bun run --cwd packages/<pkg> build:docs`).

The docs pipeline (generation, `docs/docs.config.ts`, MDX components, lint schema) is built on **leadtype** — use the `leadtype` skill for its components, config, conversion, and lint APIs rather than guessing.

## Where content lives

| Directory | Feeds |
| --- | --- |
| `docs/frameworks/{javascript,react,next,...}/` | Framework quickstarts and guides; javascript→`c15t`, react→`@c15t/react`, next→`@c15t/nextjs` bundled docs |
| `docs/integrations/` | GTM, GA4, PostHog, Meta Pixel, etc.; bundled into core/react/nextjs/scripts |
| `docs/self-host/` | Bundled into `@c15t/backend` |
| `docs/cli/` | Bundled into `@c15t/cli` |
| `docs/oss/`, `docs/contributing/`, `docs/legals/`, `docs/comparisons/` | Site only |

Navigation, groups, and page ordering are defined in `docs/docs.config.ts`. New pages usually need an entry there (see the `leadtype` skill for the config schema).

## MDX rules

- Frontmatter is required: `title` and `description`. The description doubles as the intro paragraph.
- **Never start with an H1** — the frontmatter title renders as the page H1. Begin content at `##` and nest properly (H2 → H3 → H4).
- Use `<Callout>` for warnings/notes and `<PackageCommandTabs command="..." />` / `package-install` code blocks for install commands so all package managers render.
- Fenced code blocks always carry a language identifier.
- Lists use `-` bullets (remark enforces consistency).

## Style

- Simple, direct, active voice; second person ("you"). Define jargon and acronyms on first use, then stay consistent (don't mix "endpoint" and "route").
- Show working code before explaining it. Every key concept gets a runnable snippet.
- Match the document type: tutorials are sequential and confirm success at each step ("You should now see…"); how-to guides are numbered steps that assume the basics; reference pages are exhaustive, scannable, and neutral; explanations discuss trade-offs and may be opinionated ("We recommend X because…").
- Be honest about limitations ("works well for small datasets, but…").

## Verify

```bash
bun run lint:docs   # remark lint (MDX + frontmatter + consistency)
bun run fmt:docs    # remark autoformat
bun run generate:package-docs   # refresh packages/*/docs and AGENTS.md if your pages are bundled
```

CI's autofix workflow also runs `fmt:docs` and commits fixes to your branch.
