---
title: c15t command-line tools
description: Use the CLI for initial setup, migrations and project workflows,
  then verify the generated integration.
group: cli
---

## Choose a command

The v3 CLI exposes `setup`, `codemods`, `skills`, `projects`, `self-host`, `docs`
and `changelog`. Run the installed version's `--help` for its exact command list.
Use [manual framework setup](https://c15t.com/docs/frameworks) when you want to control
each file explicitly.

Start new integrations with [Inth](../guides/inth.md). The CLI can help create the
initial files, but generated configuration still needs review for your router,
rendering mode and deployment.

## Keep the CLI version explicit

Use a CLI release compatible with the v3 packages being installed. Install that
exact release in the project rather than invoking an unpinned latest release in
automation. See [CLI quickstart](./quickstart.md).

Codemods transform known old patterns. They do not decide policy scope, establish
compliance or prove that vendor requests are blocked. Read
[the v3 migration guide](../upgrade-v3.md) and verify the resulting application.
