---
name: releasing
description: |
  Version and release c15t packages with Tegami. Use when adding release notes,
  choosing bumps for linked packages, publishing alpha/canary/RC/stable releases,
  or debugging version PRs, publish locks, artifact checks, or npm OIDC.
---

# Releasing c15t packages

Read [the release guide](../../../.tegami/README.md) before changing release
behavior. `scripts/tegami.ts` owns channels, linked packages, and publishing hooks.

## Add release notes

1. Read the changed packages' manifests to identify public packages. Private
   packages do not version or publish. Internal tooling and docs-site changes
   do not need release notes.
2. On a feature branch, run `RELEASE_BRANCH=v3 bun run tegami`, replacing `v3`
   with the PR target, or write `.tegami/YYYY-MM-DD-description.md` directly.
3. Put explicit `patch`, `minor`, or `major` entries under `packages` in YAML
   frontmatter. Include a Markdown heading and describe the user-visible change.
4. Check `linkedPackages` in `scripts/tegami.ts`. Only selected linked packages
   and affected dependents release. Name every intended package for a group-wide
   release; do not enable Tegami's `syncBump` to approximate linked behavior.
5. Leave replay-only notes in place. They preserve alpha release notes for stable
   without applying another bump. Tegami removes them when their conditions match.

Do not hand-edit package `CHANGELOG.md` files or `.tegami/publish-lock.yaml`.
Tegami generates both from release notes and package manifests.

## Validate release changes

Use a disposable checkout for `RELEASE_BRANCH=v3 bun run tegami version`.
It updates manifests, dependency ranges, changelogs, and lockfiles. Follow with
`RELEASE_BRANCH=v3 bun run tegami publish --dry-run` to validate without uploading.
The dry run still queries registry and tag status.

Run `bun run test:scripts tegami.test.ts release-workflow.test.ts` after changing
release code. Cover linked and independent bumps, dependency updates, note replay,
channel tags, and rejection of a publish lock from another branch.

## Preserve the publishing contract

- Keep publishing in `.github/workflows/release.yml` on `ubuntu-latest`, with
  `id-token: write`, npm 11.5.1 or newer, and `NPM_CONFIG_PROVENANCE=true`.
  npm trusted publishing binds to the workflow filename. Do not move publishing
  into the reusable CI workflow or add an npm token.
- Keep the build and `check:publish-artifacts` hook before any upload. Bun packs
  packages and resolves workspace dependency ranges; npm publishes the tarballs
  with OIDC. Package `prepack` checks provide an additional artifact check.
- Only `main` uses `latest`. `v3` uses `alpha`, `2.0.0` uses `rc`, and `canary`
  uses `canary`. Stable, alpha, and RC each have their own version PR branch.
- Canary snapshots use the source commit SHA and publish directly. Their generated
  versions and lock are temporary; never commit a canary version draft.
- Retry failed releases from the same commit. Tegami skips published versions and
  finishes pending tasks. Do not discard an unfinished stable/alpha/RC publish lock
  to force a new version PR.
- New npm package names need trusted publishing configured for `c15t/c15t` and
  workflow `release.yml`. Existing packages keep their current configuration.
