---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Native frontend workflows, `setup --codex`, and Inth accounts

**Breaking.** `c15t login`, `logout`, `status` and `projects` run through the
bundled Inth executable and share its session with the `inth` CLI. Sessions in
`~/.c15t/config.json` are no longer read, so run `c15t login` again. The
`authenticate` export is removed, and control-plane adapters take a working
directory, organization and abort signal instead of tokens or an API URL.

Inth runs on macOS (Apple silicon), glibc Linux (x64, arm64) and Windows x64.
Elsewhere, including Intel Macs and Alpine, account commands fail with
`INTH_UNSUPPORTED_PLATFORM`. Pass `--backend-url` or use offline mode there.

For agents and CI, `c15t login --email <email>` prints an approval URL and
code, and `c15t login --complete` finishes sign-in. `INTH_TOKEN` also works.

`c15t setup --codex` hands frontend setup to the Codex CLI. `--plan` prints the
task instead, and `--plan --json` prints it as JSON. Codex launch and native
installs support macOS and Linux. On Windows, use `--plan` and
`--skip-install`.

New exports let other CLIs run frontend setup without Node:
`@c15t/cli/generate`, `@c15t/cli/frontend`, `@c15t/cli/frontend/runtime`,
`@c15t/cli/frontend/agent` and `@c15t/cli/commands`.
