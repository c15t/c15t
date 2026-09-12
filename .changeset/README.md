# v3 alpha releases

`v3` publishes prereleases through `.github/workflows/release.yml`. All public
packages participate in the first `3.0.0-alpha.0` release. `@c15t/solid` stays
private.

The preparation commit removes old canary and RC suffixes and uses a temporary
`2.0.0` baseline for the new Astro and browser packages. These baseline versions
are inputs to Changesets, not releases to publish. The consolidated major
changeset advances every public package to `3.0.0-alpha.0`.

Changesets alpha mode is already recorded in `pre.json`. Do not enter it again
for each release or delete consumed changesets while prerelease mode is active.

1. Merge release preparation into `v3`. The workflow runs the full CI checks and
   opens a version PR using `bun run version:alpha`.
2. Review the generated versions, dependency updates, lockfile, and changelogs.
3. Merge the version PR into `v3`. The workflow builds the packages, checks their
   artifacts, resolves workspace dependencies, and publishes with npm tag `alpha`.

`release:alpha` rejects packages whose versions are not `3.0.0-alpha.N`, and
requires active alpha mode. The publish wrapper temporarily moves `pre.json`
aside so Changesets accepts an explicit `--tag alpha`, including for packages
that have only prereleases on npm. It restores the file after success or failure.
If the process is forcibly terminated, restore `.changeset/alpha-publish-*/pre.json`
to `.changeset/pre.json` before retrying. Only the `main` workflow path performs
stable releases.
New npm packages need trusted publishing configured for this repository's
`release.yml` workflow before they can publish through OIDC.

For later alphas, add ordinary changesets with `bun run changeset`. Keep entries
short and describe user-facing changes. Benchmark results belong in the release
post. Existing linked and independent versioning groups remain in place, so later
alphas can publish only the affected packages.

Before publishing, run the full test suite and inspect the built package
artifacts. To review the first versioning step locally, run `bun run version:alpha`
in a disposable checkout. It updates manifests, changelogs, prerelease state, and
the lockfile.

Leaving alpha mode or switching to beta, RC, or stable needs a separate release
change that updates the version checks and workflow together.
