# CI validation

CI groups checks by the behavior they protect. Adding another example or
benchmark should reuse an existing group unless it proves a different contract.

| Group | Owns | Does not need another copy in |
| --- | --- | --- |
| Repository and docs | Lint, format, selectors, tooling contracts, generated docs | Package runtime builds |
| Package behavior and types | Kernel/storage/policy logic, adapter components, public types, test fixture types, benchmark helper units | Every example journey |
| Database behavior | SQLite, PGlite, real Postgres/MySQL, migrations and audit contracts | Browser acceptance |
| Example acceptance | Production setup, vendor and iframe gating, revocation, navigation and outage recovery | Each benchmark timing loop |
| Next compatibility | Packed exports, Next 15/16, App/Pages, Cache Components, static export, first HTML and request/cache contracts | A second version matrix |
| Framework parity | DOM, accessibility, styles, geometry, live pixel comparisons and Storybook interactions | Example screenshot copies |
| SSR journeys | Next/Nuxt/SvelteKit headers, language, GPC, stored choices, hydration and Nuxt route contracts | Separate standalone E2E runner |
| CSS compatibility | Tailwind 3 important overrides, Tailwind 4 layers, plain CSS | Runtime performance suites |
| Consumer bundles | Initial/deferred JS, CSS, compressed sizes, import boundaries and tarballs | Per-package Rsdoctor comments |
| Runtime comparisons | Public operation costs, policy resolution, script lifecycle; full browser metrics on full CI | Routine microbench runs |

## Selection and local commands

```sh
CI_DIFF_BASE=origin/canary bun scripts/ci-plan.ts
bun scripts/ci-plan.ts --full
bun scripts/ci-run.ts build
bun scripts/ci-run.ts types
bun scripts/ci-run.ts testTypes
bun scripts/ci-run.ts tests
CI_INTEGRATION=examples CI_TARGETS=react,vue bun scripts/ci-browser.ts
CI_INTEGRATION=compat CI_TARGETS=16-app,16-static-export bun scripts/ci-browser.ts
CI_INTEGRATION=parity CI_TARGETS=react,svelte,vue,astro bun scripts/ci-browser.ts
CI_INTEGRATION=journeys CI_TARGETS=nextjs,nuxt,sveltekit bun scripts/ci-browser.ts
CI_INTEGRATION=styles CI_TARGETS=all bun scripts/ci-browser.ts
```

The selector compares committed changes with the merge base. Without
`CI_DIFF_BASE`, it selects a full run. Its regression tests use the real
workspace dependency graph, including the docs-only paths from PR #1105.
The existing `bun run test` command additionally includes local uncommitted
changes and remains useful during development.

Docs and generated package docs do not select runtime work. Runtime changes
follow reverse dependencies, while builds include forward dependencies of all
selected hosts. Unknown paths, root config, lockfiles and removed packages
select everything. Full publishing-branch and nightly runs cover the entire
graph. Stable check `CI complete` fails if any selected job fails or cancels.
Repository branch-protection settings must require this name when replacing
the old required checks.

The setup action installs the pinned toolchain and resolved Playwright
versions. Package outputs and task cache travel together in a tar artifact;
node_modules does not. Browser jobs keep failure logs and traces and report
one table per group. Newer PR commits cancel older runs.

Coverage is evidence, not a percentage target. The summary lists changed
instrumented statement-start lines and branches plus uncovered lines; full
coverage remains an artifact. Missing or empty reports fail for selected suites
that use the shared coverage configuration; non-instrumented facade/type checks
can legitimately produce no report. Add tests for missing behavior, especially
persistence, denial/revocation, server/client consistency and transport failure.
Do not add tests that merely repeat an implementation to raise a number.

The existing macOS screenshot baselines remain a local opt-in check. CI uses
live cross-framework pixel and geometry comparisons and currently passes
`--ignore-snapshots`. The historical baseline test explicitly skips before
loading stories, rather than reporting success with disabled assertions.
Vendor network probes retain their separate schedules and isolation because
local SDK mocks cannot prove a real vendor's tracking behavior.

See [benchmark commands and profiles](../benchmarks/README.md#ci-comparisons).
