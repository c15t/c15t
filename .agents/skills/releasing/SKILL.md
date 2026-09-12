---
name: releasing
description: |
  Version and release c15t packages with Changesets. Use when adding a
  changeset to a PR, deciding bump types for the linked package group,
  publishing alpha/canary/RC/stable releases, or debugging release CI failures
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
- Check `.changeset/config.json` for the current linked group. Linked packages share a version when released together, but bumping one does not release every member. Explicitly select every intended package for an all-package release.
- Read each package's `private` field to determine whether it publishes. Vue and Svelte are public on v3; Solid remains private. Packages outside the linked group version independently.
- Write the changeset summary like a changelog entry (it becomes one): imperative, user-facing, mentions migration steps for breaking changes.

## Release channels

| Branch | Channel | How it publishes |
| --- | --- | --- |
| `canary` (default, PR target) | `--tag canary` snapshots | Automatically on every merge (`version:canary` + `release:canary`) |
| `v3` | Alpha pre-release | Version PR via `version:alpha`; merging it publishes via `release:alpha` with npm tag `alpha` |
| `2.0.0` | RC pre-release | Release workflow versions with `bun run version` and publishes via `release:rc`; `version:rc`/`version:rc:exit` toggle changeset pre mode manually when needed |
| `main` | stable | Changesets opens a "Version Packages" PR; merging it publishes |

`sync-canary.yml` keeps canary in sync with main.

For v3 alpha preparation and subsequent releases, follow
[the alpha release instructions](../../../.changeset/README.md). Keep alpha mode
active and retain consumed changesets so Changesets can track subsequent
prereleases. The alpha scripts reject versions from other channels. Keep alpha
changeset entries short; benchmark results belong in the release post.

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
