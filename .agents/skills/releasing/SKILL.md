---
name: releasing
description: |
  Version and release c15t packages with Changesets. Use when adding a
  changeset to a PR, deciding bump types for the linked package group,
  publishing canary/RC/stable releases, or debugging release CI failures
  (publish artifacts check, workspace dependency resolution).
---

# Releasing c15t Packages

Publishing is automated by `.github/workflows/release.yml` via Changesets. Your job in a PR is usually just to add the right changeset.

## Adding a changeset

```bash
bun run changeset
```

Pick the affected packages and a bump. Rules:

- Any user-facing change to a published package needs a changeset; internal-only changes (tests, benchmarks, `internals/`, docs-site-only) do not.
- These packages are **linked** and always version together — bumping one bumps all: `c15t`, `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/iab`, `@c15t/nextjs`, `@c15t/node-sdk`, `@c15t/react`, `@c15t/translations`. Choose the bump for the *most significant* change in the group.
- `@c15t/scripts`, `@c15t/ui`, `@c15t/schema`, and `@c15t/logger` version independently. `@c15t/vue`, `@c15t/svelte`, and `@c15t/solid` are currently private and unversioned.
- Write the changeset summary like a changelog entry (it becomes one): imperative, user-facing, mentions migration steps for breaking changes.

## Release channels

| Branch | Channel | How it publishes |
| --- | --- | --- |
| `canary` (default, PR target) | `--tag canary` snapshots | Automatically on every merge (`version:canary` + `release:canary`) |
| `2.0.0` | RC pre-release | Release workflow versions with `bun run version` and publishes via `release:rc`; `version:rc`/`version:rc:exit` toggle changeset pre mode manually when needed |
| `main` | stable | Changesets opens a "Version Packages" PR; merging it publishes |

`sync-canary.yml` keeps canary in sync with main.

## What the release scripts do

`bun run release` = build → `check:publish-artifacts` → `resolve-workspace-deps` → `changeset publish`.

- `scripts/check-publish-artifacts.ts` fails if test/snapshot/screenshot/MSW/Rsdoctor files would be packed. Fix by keeping tests in `__tests__/` or `*.test.*`/`*.spec.*` (rslib excludes those) — don't widen the allowlist casually.
- `scripts/resolve-workspace-deps.ts` rewrites `workspace:*` ranges to real versions before publish. If a new workspace dependency breaks publishing, check it's declared with a `workspace:` protocol.
- The core SDK packages (`c15t`, `@c15t/react`, `@c15t/nextjs`, `@c15t/backend`) also run `scripts/verify-package-artifacts.ts` via `prepack` as a final tarball sanity check.

## Verifying locally

```bash
bun run build:libs
bun run check:publish-artifacts
bun pm pack --dry-run --cwd packages/<pkg>   # inspect what would ship
```

The tarball should match the package's `files` array — typically `dist/` and `dist-types/`, plus `README.md`/`CHANGELOG.md` and (for docs-bundled packages) `AGENTS.md` + `docs/` where listed. No test, snapshot, or mock files, ever.
