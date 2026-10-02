---
packages:
  '@c15t/cli': minor
---

### Reuse native frontend workflows and Inth accounts

Export generation plans and argument parsing through `@c15t/cli/generate`,
host-owned setup, project selection and account status through
`@c15t/cli/frontend`, and the Node command registry through `@c15t/cli/commands`.
Ship independent TypeScript sources for static scriptc 0.2.0 hosts, enabling
commands such as `inth c15t generate` without `--dynamic` or database dependencies.

Accept generation defaults and provisioned backend URLs from the host, or
resolve a selected project from its fetched project list. Report missing or
malformed hosted URLs with guidance to supply `--backend-url` or select a
project. Accept forwarded `--mode` arguments and reject repeated modes.

Use `@alpha` for bare c15t dependencies in portable hosts and retain the
standalone CLI's release-line installation rules. Preserve explicit versions,
external dependencies and local package snapshots.

Add `@c15t/cli/frontend/runtime` for plan/apply, symlink and conflict checks,
interrupted recovery, and npm, pnpm, yarn or Bun installation after file apply.
Installer failures preserve generated files and report a retry command. Clean
up unpublished stages after an initial journal write failure; recover missing
or partial journals only when no staged files or unexpected contents remain.
Preserve application edits and replacement files during recovery.

Add `setup --codex` and `@c15t/cli/frontend/agent` for the shared v3 frontend
task and launcher. Preserve the agent's approval settings, exit status and
cancellation. Preview with `--plan` or `--dry-run`, copy the complete prompt
to the clipboard and confirm the copy, or provide a manual-copy fallback.
JSON previews export the task without clipboard access. Include only named
public configuration and omit the inputs section when none is supplied.
Keep `generate` deterministic.

Delegate standalone login, logout, status, organization and region lookup,
and project provisioning to the pinned Inth native executable. Reuse Inth's
connection, credential storage and token refresh. Use `consent.backendUrl`,
follow all pagination and reject pending backends. Store only the public project
selection in the application's `.c15t/project.json`. Legacy c15t credential
files remain untouched and are no longer read. Replace raw-token authentication
exports with the executable adapter; control-plane adapters accept cwd,
organization and cancellation instead of credentials or a custom API URL.

Codex launch and native dependency installation support macOS and Linux.
On Windows, use prompt preview and manual dependency installation. Native
workflows that request installation on Windows fail before writing files.
