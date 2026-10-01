---
packages:
  '@c15t/cli': minor
---

### Reuse frontend commands in native host CLIs

Export standalone generation plans and an argument parser through
`@c15t/cli/generate`. Ship dependency-free TypeScript sources for vendoring into
scriptc 0.2.0 hosts, enabling static native generation without `--dynamic`.
Export the Node command registry through `@c15t/cli/commands`.

Add `@c15t/cli/frontend` for host-owned setup/generation, project listing and
selection, and account status. Accept generation defaults and provisioned
backend URLs from the host, or resolve a selected project from its fetched
project list. Share project and session logic with the standalone CLI. Hosts
own network access, prompts, file writes, credential stores, and selection
persistence; the frontend entry point has no database dependencies.

Use `@alpha` when installing bare c15t dependencies and when recommending
dependencies for standalone boilerplate. Preserve explicitly requested versions,
external dependencies, and local package snapshots.

Add `@c15t/cli/frontend/runtime` for explicit plan/apply, symlink and conflict
checks, and recovery of interrupted file writes. Keep replaced or edited files
when recovering. Support npm, pnpm, yarn, and Bun installation after file apply;
installer failures preserve generated files and report a retry command. Ship
runtime TypeScript sources with the frontend source export for static hosts.

Add `setup --codex` to launch the installed Codex CLI with the default c15t v3
frontend task. Support read-only prompt preview with `--plan` or `--dry-run`,
including JSON export. Pass only named public setup inputs, preserve the
agent's configured approval settings, and propagate exit status and cancellation.
Export the shared prompt builder and launcher through `@c15t/cli/frontend/agent`
and ship their sources for static scriptc hosts. Keep `generate` deterministic.
