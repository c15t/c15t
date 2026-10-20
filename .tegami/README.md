# 1.x maintenance releases

Tegami versions and publishes the c15t 1.x line from the `release/v1` branch
through `.github/workflows/release.yml`. The workflow filename, GitHub-hosted
publishing runner, `id-token: write`, and npm provenance stay in place for the
existing npm trusted publishers. No npm token is used.

Every 1.x release goes to the npm dist-tag `v1-legacy`. It never moves
`latest`, which stays on the current major. Install a 1.x release with:

```sh
npm install c15t@v1-legacy
```

## Add release notes

Use Bun 1.3.11 and Node.js 24 or later for release tooling. On a branch that
targets `release/v1`, run:

```sh
RELEASE_BRANCH=release/v1 bun run tegami
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

Choose `patch` or `minor`. A `major` note fails, because the result would leave
1.x. Internal tooling, tests, and docs-site changes do not need release notes.
Generated package changelogs and `.tegami/publish-lock.yaml` are outputs; do
not edit them.

## How a release happens

1. A push to `release/v1` runs CI, then `bun run tegami ci`.
2. When release notes are pending, Tegami opens or updates a version PR from
   `tegami/version-packages-release-v1` into `release/v1`. The PR contains the
   new versions, dependency updates, the Bun lockfile, changelogs, and the
   publish lock.
3. Merging the version PR publishes the packages in the publish lock under
   `v1-legacy`, then creates git tags. It creates no GitHub releases: GitHub
   would mark each one as the repository's latest, above the current major.

Pushes without pending notes or an unfinished lock do nothing. If a publish
fails, the lock stays, and the next push to `release/v1` retries it before
versioning any newer notes. Use `bun run tegami ci`, not Tegami's own `ci`
command, because the wrapper in `scripts/tegami.ts` does that check.

To release without the CI suites, run `release.yml` manually on `release/v1`
with `skip_tests` enabled:

```sh
gh workflow run release.yml --ref release/v1 -f skip_tests=true
```

The publish step still builds the packages first. A failed build stops
publication.

## Versioning rules

`scripts/tegami.ts` keeps the `linked` group from the old Changesets config:
`c15t`, `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/nextjs`,
`@c15t/node-sdk`, `@c15t/react`, and `@c15t/translations`. Selected linked
packages take the group's highest version and bump type. Members without a
change stay on their version. Workspace dependencies still cause dependent
releases, so a `c15t: minor` note releases `c15t`, `@c15t/react`,
`@c15t/nextjs`, `@c15t/dev-tools`, and `@c15t/cli` together.

`@c15t/backend` does not release from this line. Dependency updates never bump
it, and a release note that names it fails. Private packages are excluded from
versioning and publishing.

## Publishing checks

The publish lock records the branch and exact versions. Publishing rejects a
lock from another branch, a mismatched version, and any npm tag other than
`v1-legacy`.

Bun packs each package and replaces `workspace:` ranges with the versions in
`bun.lock`. The version step writes the new versions into `bun.lock`, because
Bun 1.3.11 leaves them stale after version-only manifest edits. Before upload,
the release hook fails if `bun.lock` disagrees with any manifest, then builds
the packages in the plan with Turbo. Tegami then runs `npm publish` with
`--tag v1-legacy` for OIDC authentication. Each package's `publishConfig.tag`,
except `@c15t/backend`, which this line does not release, is also
`v1-legacy`, so a manual `npm publish` does not move `latest` either.

Keep publishing in `release.yml`. Moving it to another top-level workflow
changes the identity npm trusts.

## Inspect a release

Use a disposable checkout. Versioning changes files:

```sh
RELEASE_BRANCH=release/v1 bun run tegami version
```
