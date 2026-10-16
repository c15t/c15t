---
name: releasing
description: |
  Version and release c15t packages with Tegami. Use when adding release notes,
  choosing bumps for linked packages, publishing canary or stable releases,
  or debugging version PRs, publish locks, artifact checks, or npm OIDC.
---

# Releasing c15t packages

Read [the release guide](../../../.tegami/README.md) before changing release
behavior. `scripts/tegami.ts` owns channels, linked packages, and publishing hooks.

## Add release notes

1. Read the changed packages' manifests to identify public packages. Private
   packages do not version or publish. Internal tooling and docs-site changes
   do not need release notes.
2. On a feature branch, run `RELEASE_BRANCH=canary bun run tegami`, replacing
   `canary` with the PR target if it differs, or write `.tegami/YYYY-MM-DD-description.md` directly.
3. Put explicit `patch`, `minor`, or `major` entries under `packages` in YAML
   frontmatter. Include a Markdown heading and describe the user-visible change.
4. Check `linkedPackages` in `scripts/tegami.ts`. Only selected linked packages
   and affected dependents release. Name every intended package for a group-wide
   release; do not enable Tegami's `syncBump` to approximate linked behavior.
5. Leave replay-only notes in place. They preserve canary release notes for stable
   without applying another bump. Tegami removes them when their conditions match.

Do not hand-edit package `CHANGELOG.md` files or `.tegami/publish-lock.yaml`.
Tegami generates both from release notes and package manifests.

## Validate release changes

Use a disposable checkout for `RELEASE_BRANCH=canary bun run tegami version`.
It updates manifests, dependency ranges, changelogs, and lockfiles. Follow with
`RELEASE_BRANCH=canary bun run tegami publish --dry-run` to validate without uploading.
The dry run still queries registry and tag status.

Run `bun run test:scripts tegami.test.ts release-workflow.test.ts` after changing
release code. Cover linked and independent bumps, dependency updates, note replay,
canary base escalation, channel tags, and rejection of a publish lock from another branch.

## Preserve the publishing contract

- Keep publishing in `.github/workflows/release.yml` on `ubuntu-latest`, with
  `id-token: write`, npm 11.5.1 or newer, and `NPM_CONFIG_PROVENANCE=true`.
  npm trusted publishing binds to the workflow filename. Do not move publishing
  into the reusable CI workflow or add an npm token.
- Keep the build and `check:publish-artifacts` hook before any upload. Bun packs
  packages and resolves workspace dependency ranges; npm publishes the tarballs
  with OIDC. Package `prepack` checks provide an additional artifact check.
- Only `main` and `canary` release. `main` uses `latest`, and `canary` uses
  `canary` with `X.Y.Z-canary.N` versions. Each has its own version PR branch,
  `tegami/version-packages-<branch>`. A push opens or updates it, and merging it
  publishes.
- Retry failed releases from the same commit. Tegami skips published versions
  and finishes pending tasks. Once a newer commit lands on the
  branch, an older run does not release. The newer run releases both if its
  checks pass; if they fail, nothing releases until a later push passes. Do not
  discard an unfinished publish lock to force a new version PR.
- New npm package names need trusted publishing configured for `c15t/c15t` and
  workflow `release.yml`. Existing packages keep their current configuration.
