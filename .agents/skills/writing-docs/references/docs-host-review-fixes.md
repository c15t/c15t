# Docs host review fixes

The content repository cannot publish the separate docs host. The companion
[patch](docs-host-review-fixes.patch) preserves the review fixes applied to
`apps/c15t-docs` in the host worktree:

- Public agent instructions identify v3 and the Inth backend.
- The framework picker Markdown URL resolves to its generated index.
- Framework and product context appears in metadata titles.
- Regression tests cover titles and the Markdown alias.

The patch also includes the host's shared metadata-title module and export,
which the current page implementation requires. That module scopes visible page
titles while leaving navigation labels separate. It was introduced during the
host's concurrent title refactor; preserve it when publishing these changes.

Apply this alongside the earlier `docs-host-v3.patch`, checking the target
branch first. These changes are already present in the local preview worktree.
The patch passed `git apply --reverse --check` there. It excludes the host's
unrelated configuration edits and other applications' title changes.

The host still needs its existing intentional-removal acknowledgement for
`/docs/guides/inth` and the separately managed changelog redirects. Neither is
replaced by this patch.
