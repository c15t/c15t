# Releases (2.x maintenance)

This branch is the c15t 2.x maintenance line. Tegami versions and publishes it
through `.github/workflows/release.yml`. The workflow filename, GitHub-hosted
publishing runner, `id-token: write`, and npm provenance stay in place for the
existing npm trusted publishers. No npm token is needed.

## Release channel

| Branch | npm tag | Versions |
| --- | --- | --- |
| `release/v2` | `v2-legacy` | Stable 2.x, such as `2.4.0` |

Only `release/v2` releases. 2.x versions never take the `latest` tag, which
stays on 3.x. Every publishable package except `@c15t/backend`, which this
line does not release, also sets `publishConfig.tag` to `v2-legacy`, so a
manual `npm publish` from this branch does not move `latest` either.

Users install a 2.x release with `npm install c15t@v2-legacy`, or with an
explicit version.

Publishing creates git tags but no GitHub releases. GitHub would mark each new
release as the repository's latest, above 3.x.

## Add release notes

Use Bun 1.3.11 and Node.js 24 or later for release tooling. On a branch that
targets `release/v2`, run:

```sh
RELEASE_BRANCH=release/v2 bun run tegami
```

Or add `.tegami/YYYY-MM-DD-description.md` with explicit package bumps and a
Markdown heading:

```md
---
packages:
  c15t: patch
  '@c15t/react': patch
---

### Fix consent persistence

Keep saved preferences after reloading the page.
```

Choose `patch` or `minor`. A `major` note would produce 3.0.0, which this line
rejects. Internal tooling, tests, and docs-site changes do not need release
notes. Generated package changelogs and `.tegami/publish-lock.yaml` are
outputs; do not edit them.

## How a release happens

A push to `release/v2` runs the CI checks, then `bun run tegami ci`. When
release notes are pending, it opens or updates a version PR from
`tegami/version-packages-release-v2` into `release/v2`. The PR contains
manifests, the Bun lockfile, changelogs, and the publish lock. Merging it
publishes every bumped package under `v2-legacy`. Pushes without pending notes
or an unfinished lock do nothing.

The CLI wrapper checks for an unfinished publish lock before running `ci` and
publishes that lock first, leaving any newer notes for the next run. A failed
retry preserves the lock. Use `bun run tegami ci`, not Tegami's upstream `ci`
command, which skips this check.

To release without the CI suites, run `release.yml` manually with `skip_tests`:

```sh
gh workflow run release.yml --ref release/v2 -f skip_tests=true
```

Tegami still builds the libraries and checks their tarballs before uploading.

## Versioning rules

`scripts/tegami.ts` keeps the linked group from the old Changesets config:
`c15t`, `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/iab`,
`@c15t/nextjs`, `@c15t/node-sdk`, `@c15t/react`, and `@c15t/translations`.
Selected linked packages use the group's highest version and bump type;
unchanged members keep their version. Other packages version independently.
A package that depends on a bumped package gets at least a patch, because
`workspace:*` dependencies publish as exact versions. Private packages never
version or publish.

`@c15t/backend` does not release from this line. Dependency updates skip it,
and a release note that names it fails.

## Publishing checks

Before uploading any package, Tegami runs `bun run build:libs` and
`bun run check:publish-artifacts`. A failed build or artifact check stops the
release. Bun packs each package and resolves `workspace:` dependencies in the
tarball, then `npm publish` uploads it with OIDC. Package `prepack` checks still
run. The version step refreshes workspace versions in `bun.lock`, because Bun
1.3.11 leaves them stale after version-only manifest changes, and packing reads
them from there.

The publish lock records the branch and exact versions. Publishing rejects a
lock from another branch, a version outside 2.x, and any npm tag other than
`v2-legacy`.

## Inspect a release

Use a disposable checkout:

```sh
RELEASE_BRANCH=release/v2 bun run tegami version
```

Versioning changes files. `bun run tegami publish --dry-run` validates the plan
without uploading, but it still queries the npm registry.
