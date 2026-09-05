# c15t Monorepo

c15t is a developer-first consent management platform (CMP): cookie banners, consent dialogs, preference centers, consent-gated script loading, Google Consent Mode v2, and IAB TCF 2.3 for JavaScript, React, Next.js, Vue, Svelte, and Solid. This repo contains the published npm packages, the MDX source for the c15t.com docs, benchmarks, Storybook apps, and a demo.

This file is the canonical agent guide. `CLAUDE.md` imports it. Deeper task guides live in `.agents/skills/` (symlinked into `.claude/skills/`, `.cursor/skills/`, and `.github/skills/`). Third-party skills are managed with the [skills CLI](https://skills.sh) and pinned in `skills-lock.json` — add or refresh them with `bunx skills add <owner>/<repo>` / `bunx skills update -y`, never by hand-editing their files. The first-party skills (`writing-docs`, `releasing`, `creating-a-package`) are maintained in this repo.

## Repo map

| Path | What it is |
| --- | --- |
| `packages/core` | `c15t` — headless consent engine (storage, script gating, callbacks) |
| `packages/react` | `@c15t/react` — banner/dialog/preference-center components + headless hooks |
| `packages/nextjs` | `@c15t/nextjs` — Next.js integration (App + Pages Router, SSR) |
| `packages/tanstack-start` | `@c15t/tanstack-start` — TanStack Start integration (server routes, server functions, request middleware, SSR) |
| `packages/ui` | `@c15t/ui` — framework-agnostic primitives, CSS, theme system |
| `packages/vue`, `packages/svelte`, `packages/solid` | Thin framework re-exports of `@c15t/ui` |
| `packages/scripts` | `@c15t/scripts` — consent-aware loaders for GTM, GA4, pixels, widgets |
| `packages/iab` | `@c15t/iab` — IAB TCF 2.3 addon (TC String, GVL, vendor consent) |
| `packages/backend` | `@c15t/backend` — self-hostable consent backend (policies, audit, geo) |
| `packages/cli` | `@c15t/cli` — scaffolding/setup CLI |
| `packages/node-sdk`, `packages/schema`, `packages/translations`, `packages/logger`, `packages/dev-tools` | Node API client, Valibot schemas, i18n, logger, devtools |
| `packages/shared` | Not a package — shared build helpers (`rslib-utils.ts`) |
| `docs/` | MDX source for c15t.com **and** the docs bundled into published packages |
| `internals/` | `@c15t/typescript-config`, `@c15t/vitest-config`, storybook tests, bundle-analysis action |
| `apps/` | Storybook apps per framework + bundle bench |
| `examples/demo` | Next.js demo app (`bun run dev` runs this) |
| `benchmarks/` | Bundle-size, runtime, and CSS-compat benchmark harnesses |
| `scripts/` | Repo tooling: docs generation, readme generation, publish checks |

## Toolchain

Bun `1.3.11` is the package manager and script runner. Turborepo orchestrates tasks. Packages build with **rslib** (ESM only into `dist/`, types into `dist-types/`). Tests run with **Vitest — not `bun test`** — including Playwright-backed browser tests. **Oxlint** handles linting and **Oxfmt** handles formatting through Ultracite presets. Versioning/publishing is **Changesets**. Lefthook installs a pre-commit hook (Oxfmt on staged files) on `bun install`.

## Commands

```bash
bun install                                          # postinstall sets up lefthook

bun run build                                        # everything, via turbo
bun turbo run build --filter=@c15t/react             # one package (+ its deps)

bun run test                                         # affected packages + dependents vs origin/canary
bun run test:full                                    # every package, via turbo (builds first)
bun run test:scripts                                 # root repository tooling tests
bun turbo run test --filter=@c15t/react              # one package
bun run --cwd packages/react test src/foo.test.tsx   # one file — runs the package's `test` script
                                                     # (handles prebuild/version.ts); build deps once first.
                                                     # NOTE: `bun run --cwd <dir> <script>`, not `bun --cwd <dir> run`
                                                     # — the latter silently lists scripts instead of running

bun run check-types                                  # tsc --noEmit per package (depends on build)
bun run lint                                         # Oxlint via turbo + repo-wide backstop
bun run fmt                                          # repo-wide Oxfmt
bun run lint:docs && bun run fmt:docs                # remark for docs/**/*.mdx

bun run dev                                          # examples/demo + watch-builds of its deps
bun run --cwd examples/demo dev:localhost            # plain `next dev` (no portless/https)
```

Browser tests (react, nextjs, tanstack-start) need Chromium: `bunx playwright@1.58.2 install`.

`check-types` and `test` depend on `build` in `turbo.json` — if types look stale or imports of workspace packages fail, build first.

`bun run test` selects affected packages **and their dependents** against `origin/canary`, counting committed, staged, unstaged, and untracked non-ignored changes. Its Bun wrapper forwards additional Turbo arguments unchanged. Because `c15t` and `@c15t/ui` sit near the root of the graph, a change to either still fans out to most packages; the saving is real for leaf packages (`cli`, `node-sdk`, `dev-tools`, the `vue`/`svelte`/`solid` wrappers) and docs-only work. Use `bun run test:full` before a release or when you want the whole suite. On a stacked branch, override the base with `TURBO_SCM_BASE=origin/<parent> bun run test`, and fetch `origin/canary` in long-lived worktrees so the remote-tracking ref is current. `bun run test:scripts` covers root repository tooling outside the package Turbo graph and runs on every CI event.

Touching `bun.lock` or the root `package.json` marks **every** package affected, so dependency bumps always get a full run — intended, since a dependency change can affect anything. If `--affected` unexpectedly selects everything, check for an uncommitted lockfile change first.

`--affected` combined with `--filter` requires turbo ≥ 2.10; 2.9.x rejects the two flags together.

Keep `cacheDir` unset — Turborepo detects a linked Git worktree and automatically redirects its cache to the **main** worktree's `.turbo/cache`, so worktrees share build artifacts for free. Setting an explicit `cacheDir` disables that sharing and gives each worktree its own cache. This is local-only: CI runners do a fresh clone, not a linked worktree, so it does nothing for CI. Install dependencies separately in each worktree rather than symlinking `node_modules`; Bun's global cache already deduplicates package contents.

## Code style

Enforced by `oxlint.config.ts` and `oxfmt.config.ts` (root):

- Tabs, line width 80, single quotes, semicolons, LF. JSX uses double quotes.
- Oxlint extends Ultracite's core, React, and Vue presets. Rules with existing violations are listed as deferred in `oxlint.config.ts`; all other preset rules remain errors.
- Oxfmt deliberately leaves import, package JSON, and Tailwind sorting disabled to avoid unrelated reorder-only diffs.

Conventions not enforced by tooling (hold new code to these; older code has exceptions):

- Avoid TypeScript `enum`s — use `as const` objects.
- File names use ASCII **kebab-case**.
- TypeScript is strict (`strict`, `noUncheckedIndexedAccess` via `@c15t/typescript-config`). Avoid `any`; prefer `unknown`.
- Public APIs carry TSDoc (`@param`, `@returns`, `@throws`, `@example`, `@internal` where relevant); descriptive generic names (`ResponseType`, not `T`).
- React UI uses compound components (`Component.Root`/`Component.Child`), context with throwing accessor hooks, and `asChild` composition.
- Commits follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).

## Generated files — never hand-edit

| File(s) | Generated by | Source of truth |
| --- | --- | --- |
| `AGENTS.md` + `docs/` in packages core, react, nextjs, backend, scripts, cli | `scripts/generate-package-docs.ts` (leadtype — see the `leadtype` skill), runs during those packages' builds | `docs/**/*.mdx` + `docs/docs.config.ts` |
| `README.md` in packages that have a `readme.json` | `bun run generate:readmes` | that package's `readme.json` |
| `packages/*/src/version.ts` | `genversion` via each package's `prebuild` | package.json version |
| `dist/`, `dist-types/`, `coverage/` | builds/tests | — |
| `.docs/` | `bun run setup:docs` (private docs-site template; maintainers only) | — |

To change package-bundled docs or READMEs, edit the source (`docs/**/*.mdx` or `readme.json`) and regenerate.

The package-level `AGENTS.md` files are **consumer-facing** documentation indexes that ship in the published tarballs (they are listed in each package's `files`), so an agent in a user's app can read the docs offline from `node_modules`. They are not contribution guidance, they are gitignored here, and they only appear after a build. Keep them useful to that audience — don't add monorepo-only instructions to them. This file's rules still apply when you work inside those packages.

## Change hygiene

When adding or changing user-facing package behavior:

- Update or add docs in `docs/**/*.mdx` when the change affects public APIs, integration behavior, setup steps, configuration, migration paths, or user-visible defaults. Use the `writing-docs` skill for docs work, and the `leadtype` skill when touching docs components, navigation/config, MDX conversion, linting, or generated package docs.
- If the docs are bundled into packages, regenerate with `bun run generate:package-docs` or the relevant package `build:docs` script.
- Add a changeset for user-facing published-package changes with `bun run changeset`. Write the summary as the changelog entry.
- Do not hand-edit package `CHANGELOG.md` files during normal feature work; Changesets generates them. Only amend an unpublished generated changelog as part of release/version PR cleanup.

## Branches and releases

- **`canary`** is the default branch and PR target; merges auto-publish `--tag canary` snapshots.
- **`main`** is stable; **`2.0.0`** publishes RC pre-releases. `sync-canary.yml` syncs main → canary.
- User-facing package changes need a changeset (`bun run changeset`). `c15t`, `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start`, `@c15t/backend`, `@c15t/cli`, `@c15t/iab`, `@c15t/node-sdk`, `@c15t/translations`, and `@c15t/dev-tools` are **linked** — they version together.
- See the `releasing` skill for the full flow.

## CI on pull requests

- **CI** (`ci.yml`): `turbo run check-types`, repo-wide Oxlint, Oxfmt checks, root script tests, `turbo run build --filter="./packages/*"`, and `turbo run test --filter="./packages/*"`; a separate coverage workflow posts per-package coverage comments afterward. Build and package tests are `--affected` on pull requests and run in full on pushes to `canary`, `main`, and `2.0.0`; `check-types` and root script tests always run in full as cross-package backstops. Successful push CI then calls the release workflow, so publishing cannot start before every CI job passes. A PR that affects no package tests nothing and posts no coverage comment — that is expected, not a failure.
- **autofix.ci**: runs `bun fmt` + `bun fmt:docs` and pushes fixes to your branch — pull before adding commits after CI runs.
- **Bundle Analysis** (every PR) and **Benchmark Regression** (path-filtered: core/react/nextjs/translations/ui/benchmarks/lockfile/turbo.json) post bundle-size and perf comparisons. For perf work, include before/after benchmark numbers (`bun run bench`).
- **PR Preview**: publishes preview packages to pkg.pr.new for package-path changes, but only for org members or PRs labeled `deploy:preview`.

## Contributing rules

Create an issue before starting feature work; features/refactors/architecture changes need a maintainer to remove the `needs-approval` label first. Bug fixes, docs, and perf improvements can start immediately. See `.github/CONTRIBUTING.md`.

## Gotchas

- `bunfig.toml` delays newly published npm versions by 3 days (`minimumReleaseAge`) — a just-released dependency version won't resolve.
- Root scripts intentionally mix runners (`bun`, `bunx`, `tsx`) — copy the existing script's invocation style rather than "fixing" it.
- `scripts/check-publish-artifacts.ts` fails the release if test/snapshot/mock artifacts leak into the publish tarball; keep test files under `__tests__/` or `*.test.*` patterns so rslib excludes them.
- The docs site app is a private template; external contributors edit `docs/**/*.mdx` only and preview via the PR's docs preview action.
