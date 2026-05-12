# Open-Source Software (OSS) Repository Security Hardening Guide

This guide captures the supply-chain hardening baseline used for c15t after the
May 2026 TanStack incident. Use it as the standard prompt and review checklist
when bringing other open-source software (OSS) repositories up to the same level.

## TanStack Incident Summary

The relevant failure mode was not a stolen maintainer password or a leaked
long-lived npm token. The attack used continuous integration (CI) itself:

- A malicious fork pull request (PR) triggered a `pull_request_target` workflow.
- That workflow checked out attacker-controlled code while running in the base
  repository context.
- The job had access to write a shared GitHub Actions cache.
- A later legitimate release workflow restored the poisoned cache.
- The poisoned cache extracted the short-lived publish credential when it was
  minted by OpenID Connect (OIDC) trusted publishing.
- Compromised package artifacts were published before maintainers saw the issue.

The lesson: OIDC, provenance, 2FA, and lockfiles are necessary, but they do not
protect a release pipeline if untrusted CI can poison state that trusted release
CI later consumes.

## Target Baseline

Every maintained OSS repo should meet this baseline.

### GitHub Actions Event Safety

- Do not use `pull_request_target` for jobs that check out, build, install, test,
  lint, or otherwise execute PR code.
- Prefer `pull_request` for untrusted PR code.
- If a workflow needs write permissions to comment on a PR, split it:
  - `pull_request` workflow: run untrusted code with read-only permissions and
    upload a minimal artifact.
  - `workflow_run` workflow: run in the base repo context, download the artifact,
    validate it, and post comments or statuses.
- Do not pass repository secrets, deploy tokens, npm tokens, or remote-cache
  credentials to PR jobs.
- Set top-level or job-level `permissions` explicitly. Default to `contents:
  read` or `permissions: {}`.

### Cache Safety

- Treat GitHub Actions caches as untrusted across privilege boundaries.
- Do not allow PR workflows to write caches that release workflows later read.
- Replace `actions/cache` with `actions/cache/restore` when cache writes are not
  required.
- Disable package-manager setup caches in release workflows.
- Do not restore caches in publish workflows unless there is a strong reason and
  the cache key cannot be influenced by untrusted code.
- Do not pass Turbo or other remote-cache credentials to PR jobs.

### Release Safety

- Use npm trusted publishing with GitHub OIDC for packages that support it.
- Do not inject long-lived npm publish tokens into release jobs.
- Remove `NPM_TOKEN`, `NODE_AUTH_TOKEN`, and custom npm publish secrets from
  release environments after trusted publishing is verified.
- Keep `id-token: write` scoped only to release jobs that publish.
- Enable npm provenance for published packages.
- Pin release runtime versions. Avoid `latest` in release jobs.
- Build and publish from protected branches only.

### Dependency Freshness Delay

Use an install cooldown so brand-new compromised versions are less likely to be
installed immediately.

For Bun repositories:

```toml
[install]
minimumReleaseAge = 259200
auto = "disable"
```

`259200` seconds is three days. Existing lockfile entries are not delayed, but
new dependency resolutions are.

For pnpm repositories, use the equivalent minimum release age behavior available
in the repo's pnpm version.

### Pinning

- Pin every third-party GitHub Action to a full commit SHA.
- Keep a comment with the human version when helpful, for example:
  `owner/action@<sha> # v1.2.3`.
- Pin CI tool versions such as Bun, Node, npm, Playwright, and package publishing
  tools.
- Avoid `bunx tool`, `npx tool`, or `npm install -g tool@latest` in CI. Use exact
  versions, for example `bunx tool@1.2.3`.

### Workflow Ownership

- Add CODEOWNERS for `.github/`, `.github/workflows/`, and `.github/actions/`.
- Require approval from core maintainers for workflow changes.
- Treat workflow files as privileged code because they can run with repository
  credentials.

Example:

```text
* @primary-maintainer @security-maintainer

.github/ @primary-maintainer @security-maintainer
.github/workflows/ @primary-maintainer @security-maintainer
.github/actions/ @primary-maintainer @security-maintainer
```

### Static Analysis

- Add `zizmor` for GitHub Actions security analysis.
- Make it required for PRs that touch `.github/workflows/**` or
  `.github/actions/**`.
- Start with high-severity failures if the repo has existing workflow debt, then
  ratchet toward medium once the baseline is clean.

### Repository Settings

These cannot be fully enforced from files, but should be checked manually:

- Require non-SMS 2FA for maintainers.
- Enable private vulnerability reporting.
- Protect release branches.
- Require CODEOWNERS review for workflow changes.
- Require the security workflow and normal CI checks before merge.
- Restrict who can create or approve releases if the platform supports it.
- Remove stale repository, package registry, CI, and deploy secrets.

## Copyable Agent Prompt

Use this prompt in each OSS repo:

```text
We maintain multiple OSS repos and want this repository hardened to the same
security level as c15t after the May 2026 TanStack supply-chain incident.

Please audit and harden this repo's CI, release, cache, dependency install, and
workflow ownership setup. The target baseline is:

- No `pull_request_target` workflow may check out or execute PR code.
- Use `pull_request` for untrusted PR code.
- If a PR workflow needs write access, split it into a read-only `pull_request`
  workflow that uploads a minimal artifact and a privileged `workflow_run`
  workflow that validates that artifact before commenting or updating status.
- Do not expose repo secrets, npm tokens, deploy tokens, or remote-cache
  credentials to PR jobs.
- Replace write-capable `actions/cache` usage with `actions/cache/restore`
  wherever cache writes are unnecessary, especially in PR jobs.
- Do not restore caches in release/publish workflows unless explicitly justified.
- Use npm trusted publishing with GitHub OIDC for npm packages. Remove
  `NPM_TOKEN`, `NODE_AUTH_TOKEN`, and long-lived npm publish secrets from release
  jobs after trusted publishing is confirmed.
- Keep `id-token: write` scoped to publish jobs only.
- Enable npm provenance.
- Pin all third-party GitHub Actions to full commit SHAs.
- Pin CI runtime/tool versions. Avoid `latest`, unversioned `bunx`, unversioned
  `npx`, and `npm install -g <tool>@latest`.
- Add or update CODEOWNERS so `.github/`, `.github/workflows/`, and
  `.github/actions/` require review from core maintainers.
- Add zizmor as a required GitHub Actions security check.
- Add package-manager install cooldown behavior: Bun `minimumReleaseAge = 259200`
  or the equivalent for the repo's package manager.
- Explicitly set minimal workflow permissions.

Make the code changes directly. Preserve existing repo patterns and do not
remove useful workflows unless they cannot be made safe. After editing, run:

- workflow YAML parse or actionlint if available
- a grep/ripgrep check proving no risky patterns remain
- package-manager install dry-run if feasible

In the final response, summarize changed files, remaining admin-only settings,
and any checks that could not be run.
```

## Review Commands

Use these commands during review.

```sh
rg -n "pull_request_target|actions/cache@|cache: 'pnpm'|cache: pnpm|NPM_TOKEN|NODE_AUTH_TOKEN|NPM_RELEASE_TOKEN|bun-version: latest|npm install -g .*latest|bunx [A-Za-z0-9@/_-]+( |$)|npx [A-Za-z0-9@/_-]+( |$)" .github package.json
```

```sh
rg -n -P "uses:\s+[^\s]+@(?![0-9a-f]{40}(?:\s|$|#))[^\s#]+" .github/workflows .github/actions
```

```sh
ruby -e 'require "yaml"; Dir[".github/workflows/*.{yml,yaml}", ".github/actions/*/action.yml"].each { |f| YAML.load_file(f) }; puts "workflow yaml ok"'
```

If `actionlint` is available:

```sh
actionlint
```

For Bun repositories:

```sh
bun install --frozen-lockfile --dry-run --ignore-scripts
```

## Acceptance Criteria

A repo is at the c15t baseline when:

- No privileged workflow executes untrusted PR code.
- PR jobs do not receive secrets or remote-cache credentials.
- Caches are restore-only or clearly confined to trusted jobs.
- Publish jobs use OIDC trusted publishing and provenance, not long-lived npm
  tokens.
- All third-party actions are SHA-pinned.
- CI tools are version-pinned.
- Workflow changes require CODEOWNERS review.
- A GitHub Actions security scanner is present.
- Package installs have a release-age delay where supported.
- The remaining risks are documented as admin settings or intentional exceptions.
