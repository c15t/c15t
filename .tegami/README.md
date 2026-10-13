# Releases

Tegami versions and publishes c15t through `.github/workflows/release.yml`.
The workflow filename, GitHub-hosted publishing runner, `id-token: write`, and
npm provenance remain in place for existing npm trusted publishers. No npm
token or trusted-publisher reconfiguration is needed for existing packages.

## Add release notes

Use Bun 1.3.11 and Node.js 24 or later for release tooling. On a feature branch,
set `RELEASE_BRANCH` to the PR target:

```sh
RELEASE_BRANCH=canary bun run tegami
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

| Branch | npm tag | Versions |
| --- | --- | --- |
| `main` | `latest` | Stable, such as `3.1.0` |
| `canary` | `canary` | Prerelease, such as `3.1.0-canary.2` |

Both branches release the same way. A push runs `bun run tegami ci`, which opens
or updates a version PR on `tegami/version-packages-<branch>` when release notes
are pending. The PR contains manifests, dependency updates, the Bun lockfile,
changelogs, and the publish lock. Merging it publishes. Pushes without pending
notes or an unfinished lock do nothing.

The CLI wrapper checks for an unfinished publish lock before running `ci` and
publishes that lock first, leaving any newer notes for the next run. A failed
retry preserves the lock. Tegami's upstream `ci` command skips this check, so
use `bun run tegami ci`.

To release without the CI suites, manually run `release.yml` on the release
branch with `skip_tests` enabled:

```sh
gh workflow run release.yml --ref main -f skip_tests=true
```

The option defaults to false and applies only to manual runs. Publishing stays
in `release.yml` for npm trusted publishing. Tegami still builds the selected
packages and bundled docs and checks their tarballs before uploading. A failed
build or artifact check stops publication. Normal pushes require CI to pass.

The version hook explicitly refreshes workspace versions in `bun.lock`. Bun
1.3.11 leaves them stale after version-only manifest changes, even when running
`bun install --lockfile-only`. Packing uses the refreshed dependency versions.

Canary versions count up from the stable version. A patch note on `3.0.0`
produces `3.0.1-canary.0`, and later patch notes produce `3.0.1-canary.1` and so
on. A bigger change raises the base: a minor note after `3.0.1-canary.1` produces
`3.1.0-canary.0`, and a major note produces `4.0.0-canary.0`. Packages without
notes keep their current version, even when it is stable.

`scripts/tegami.ts` keeps the existing linked package list. Selected linked
packages use the group's highest version and bump type; unchanged members do not
release just because they belong to the group. Other packages version independently.
Workspace dependencies can still cause dependent releases. Private packages are
excluded from versioning and publishing.

## Publishing checks

Before uploading any package, the release hook builds code and bundled docs for
the packages in the publish plan and their build dependencies, then runs
`check:publish-artifacts --built` for that package set. The publishing job restores
CI outputs and Turbo caches. The guard reuses completed standard docs preparation and retains
custom packing hooks. A missing export or forbidden tarball file still fails
the release. Bun packs each package, resolves
`workspace:` dependencies in the tarball, and Tegami invokes `npm publish` for
OIDC authentication. Existing package `prepack` checks still run.

The publish lock records the release branch and exact package versions. Publishing
rejects a lock from another branch until it finishes, and rejects a mismatched
version or npm tag. Only `main` uses `latest`.
Keep publishing in `release.yml`; moving it to another top-level workflow changes
the identity npm trusts. New package names still need npm trusted publishing set
up for `c15t/c15t`, workflow `release.yml`, before their first release.

The v3 rename to `@c15t/integrations` needs its own npm trusted publisher.
The publisher configured for `@c15t/scripts` does not transfer to the new name.

### Deprecate the v3 compatibility releases

npm stores deprecation notices in the registry. A `deprecated` field in
`package.json` does not set the install warning. After both packages have been
published, a maintainer with npm access should run these commands from the
release commit for each new v3 compatibility version:

```sh
compat_version=$(node -p "require('./packages/scripts/package.json').version")
npm deprecate "@c15t/scripts@$compat_version" "Use @c15t/integrations instead. @c15t/scripts remains supported throughout v3; compatibility ends in v4."
npm view "@c15t/scripts@$compat_version" deprecated
```

Verify that `compat_version` is the just-published v3 version before running
the commands. Deprecate that exact version, including its prerelease suffix;
do not deprecate the package without a version or change older v2 releases.
Keep previously published versions available on npm.

Once `@c15t/integrations` is available, update the c15t skill in the upstream
`c15t/skills` repository to recommend the new package. Refresh the pinned copy
with `bunx skills update -y` and review the resulting skill and lockfile changes.
Do not hand-edit `.agents/skills/c15t/SKILL.md` here.

### Inspect a release

To inspect a release, use a disposable checkout:

```sh
RELEASE_BRANCH=canary bun run tegami version
RELEASE_BRANCH=canary bun run tegami publish --dry-run
```

Versioning changes files. The publish dry run validates the plan and queries
registry/tag status without uploading packages or running the build hook.

## Promote canary to stable

Merge `canary` into `main` once the canary version PR has published. Tegami
records published canary notes as replay-only entries. They do not cause
another bump on canary, and they appear again in the changelog when their
package graduates to stable on `main`. Keep replay entries until Tegami removes
them. The notes from the Changesets migration and the `3.0.0-alpha.N` line work
the same way.

Test a promotion draft in a disposable checkout with `RELEASE_BRANCH=main`
before merging.
