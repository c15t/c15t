---
name: releasing
description: |
  Version and release c15t 2.x maintenance packages with Tegami. Use when
  adding release notes, choosing bumps for linked packages, publishing from
  release/v2 under the v2-legacy npm tag, or debugging version PRs, publish
  locks, artifact checks, or npm OIDC.
---

# Releasing c15t 2.x packages

Read [the release guide](../../../.tegami/README.md) before changing release
behavior. `scripts/tegami.ts` owns the release line, linked packages, and
publishing hooks.

## Add release notes

1. Read the changed packages' manifests to identify public packages. Private
   packages do not version or publish. Internal tooling, tests, benchmarks,
   `internals/`, and docs-site changes do not need release notes.
2. Run `RELEASE_BRANCH=release/v2 bun run tegami`, or write
   `.tegami/YYYY-MM-DD-description.md` directly.
3. Put explicit `patch` or `minor` entries under `packages` in YAML
   frontmatter. A `major` note would leave 2.x and fails. Include a Markdown
   heading and describe the user-visible change.
4. Check `linkedPackages` in `scripts/tegami.ts`. Only selected linked packages
   and affected dependents release. Name every intended package for a
   group-wide release.
5. Do not name `@c15t/backend`. It does not release from this line, and a note
   that names it fails.

Do not hand-edit package `CHANGELOG.md` files or `.tegami/publish-lock.yaml`.
Tegami generates both.

## Validate release changes

Use a disposable checkout for `RELEASE_BRANCH=release/v2 bun run tegami version`.
It updates manifests, changelogs, the lockfile, and the publish lock.

Run `bun run test:scripts tegami.test.ts release-workflow.test.ts` after
changing release code.

## Preserve the publishing contract

- Keep publishing in `.github/workflows/release.yml` on `ubuntu-latest`, with
  `id-token: write`, npm 11.5.1 or newer, and `NPM_CONFIG_PROVENANCE=true`.
  npm trusted publishing binds to the workflow filename. Do not move publishing
  into the reusable CI workflow or add an npm token.
- Only `release/v2` releases, under the `v2-legacy` tag. Never `latest`, which
  stays on 3.x. Every publishable package sets `publishConfig.tag` to
  `v2-legacy` as a second guard.
- Tegami runs `build:libs` and `check:publish-artifacts` before any upload. Bun
  packs each package and resolves `workspace:` ranges in the tarball; npm
  publishes the tarball with OIDC. Package `prepack` checks still run.
- `scripts/check-publish-artifacts.ts` fails if test/snapshot/screenshot/MSW/
  Rsdoctor files would be packed. Keep tests in `__tests__/` or
  `*.test.*`/`*.spec.*` (rslib excludes those).
- Retry failed releases from the same commit. Do not discard an unfinished
  publish lock to force a new version PR.

## Verifying locally

```bash
bun run build:libs
bun run check:publish-artifacts
bun pm pack --dry-run --cwd packages/<pkg>   # inspect what would ship
```

The tarball should match the package's `files` array — typically `dist/` and `dist-types/`, plus `README.md`/`CHANGELOG.md` and (for docs-bundled packages) `AGENTS.md` + `docs/` where listed. No test, snapshot, or mock files, ever.
