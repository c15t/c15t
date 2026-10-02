---
packages:
  '@c15t/cli': minor
---

### Native frontend workflows, `setup --codex`, and Inth accounts

**Breaking:** account commands now run through Inth. `c15t login`, `logout`,
`status`, and `projects` use the bundled Inth executable and share its session
with the `inth` CLI. The `authenticate` export is removed, and control-plane
adapters take a working directory, organization, and abort signal instead of
tokens or an API URL. Sessions stored in `~/.c15t/config.json` are no longer
read; run `c15t login` again. `c15t logout` deletes that file.

Inth ships binaries for macOS on Apple silicon, glibc Linux on x64 and arm64,
and Windows on x64. On other platforms, including Intel Macs and Alpine, account
commands fail with `INTH_UNSUPPORTED_PLATFORM`. Pass `--backend-url` or use
offline mode there.

For agents and CI, `c15t login --email <email>` prints an approval URL and code,
and `c15t login --complete` finishes sign-in. `INTH_TOKEN` also works.

`c15t setup --codex` hands frontend setup to the Codex CLI. Add `--plan` to
print the task and copy it to the clipboard instead, or `--plan --json` to
get it as JSON.

New exports let other CLIs run c15t frontend setup without Node:

- `@c15t/cli/generate` builds generation plans.
- `@c15t/cli/frontend` handles setup, project selection, and status with
  host-supplied state.
- `@c15t/cli/frontend/runtime` applies plans to disk, recovers interrupted
  applies, and installs packages with npm, pnpm, yarn, or Bun.
- `@c15t/cli/frontend/agent` builds and launches the Codex task.
- `@c15t/cli/commands` exposes the command registry.

The generate and frontend modules also ship as TypeScript source for static
compilation. Generated installs follow the CLI's release line.

Codex launch and native dependency installation support macOS and Linux. On
Windows, use `--plan` and `--skip-install`.
