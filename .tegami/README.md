# Releases

Tegami versions and publishes c15t through `.github/workflows/release.yml`.
The workflow filename, GitHub-hosted publishing runner, `id-token: write`, and
npm provenance remain in place for existing npm trusted publishers. No npm
token or trusted-publisher reconfiguration is needed for existing packages.

## Add release notes

Use Bun 1.3.11 and Node.js 24 or later for release tooling. On a feature branch,
set `RELEASE_BRANCH` to the PR target:

```sh
RELEASE_BRANCH=v3 bun run tegami
```

Or add `.tegami/YYYY-MM-DD-description.md` with explicit package bumps and a
Markdown heading:

```md
---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
---

### Fix consent persistence

Keep saved preferences after reloading the page.
```

Choose `patch`, `minor`, or `major` for the public API change. Internal tooling,
tests, and docs-site changes do not need release notes. Generated package
changelogs and `.tegami/publish-lock.yaml` are outputs; do not edit them.

## Release channels

| Branch | npm tag | Workflow |
| --- | --- | --- |
| `main` | `latest` | Version PR, then stable publication |
| `v3` | `alpha` | Version PR, then `3.0.0-alpha.N` publication |
| `2.0.0` | `rc` | Version PR, then RC publication |
| `canary` | `canary` | Publish snapshots directly for each commit |

Stable, alpha, and RC use separate `tegami/version-packages-<branch>` PR branches.
CI runs `bun run tegami ci`. Pending notes produce a version PR containing
manifests, dependency updates, the Bun lockfile, changelogs, and the publish lock.
Merging the version PR triggers publication. An unfinished publish lock takes
priority over further versioning, so failed releases can be retried.

The version hook explicitly refreshes workspace versions in `bun.lock`. Bun
1.3.11 leaves them stale after version-only manifest changes, even when running
`bun install --lockfile-only`. Packing uses the refreshed dependency versions.

Canary versions include the full source commit SHA, for example
`3.0.0-canary-<sha>.0`. Every public package gets a snapshot on each canary push,
including pushes without release notes. Retrying the same source commit computes
the same versions. Canary disables version PRs and replaces any publish lock
inherited from another branch. Its temporary versions and notes are not committed.

`scripts/tegami.ts` keeps the existing linked package list. Selected linked
packages use the group's highest version and bump type; unchanged members do not
release just because they belong to the group. Other packages version independently.
Workspace dependencies can still cause dependent releases. Private packages are
excluded from versioning and publishing.

## Publishing checks

Before uploading any package, the release hook builds the libraries and bundled
docs and runs `check:publish-artifacts`. Bun packs each package, resolves
`workspace:` dependencies in the tarball, and Tegami invokes `npm publish` for
OIDC authentication. Existing package `prepack` checks still run.

The publish lock records the release branch and exact package versions. Publishing
rejects a mismatched branch, version, or npm tag. Only `main` uses `latest`.
Keep publishing in `release.yml`; moving it to another top-level workflow changes
the identity npm trusts. New package names still need npm trusted publishing set
up for `c15t/c15t`, workflow `release.yml`, before their first release.

To inspect a release, use a disposable checkout:

```sh
RELEASE_BRANCH=v3 bun run tegami version
RELEASE_BRANCH=v3 bun run tegami publish --dry-run
```

Versioning changes files. The publish dry run validates the plan and queries
registry/tag status without uploading packages or running the build hook.

## Alpha migration

The Changesets migration preserves the existing `3.0.0-alpha.N` versions.
Unconsumed changesets become ordinary Tegami notes. Consumed alpha notes become
replay-only entries, so they do not cause another alpha bump and appear again
when their package graduates to stable. Keep replay entries until Tegami removes
them. New alpha notes acquire the same replay behavior automatically.

Moving an alpha release to `main` removes the prerelease identifier and replays
its notes. Test that draft in a disposable checkout before merging the release
line. Switching to beta requires a coordinated change to the release configuration
and its version checks.
