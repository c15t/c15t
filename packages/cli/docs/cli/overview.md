---
title: CLI overview
description: Install the Inth CLI and run inth c15t to add c15t to an app with a
  coding agent or quickstart files, create or select an Inth project, and run
  the v3 codemods.
group: cli
---

## Install the Inth CLI

c15t setup runs through `inth c15t` in the Inth CLI. On macOS and Linux, the
install script needs no Node.js:

```bash
curl -fsSL https://inth.com/cli/install.sh | sh
inth --version
```

On any supported platform, including Windows, install the npm package
globally. Keep optional dependencies enabled, because they hold the native
executable:

```bash
npm install -g @inth/cli
```

To run it once without installing, use `npx @inth/cli c15t`. Run `inth update`
to move to the latest release. The
[Inth CLI docs](https://inth.com/docs/cli/getting-started) list supported
platforms.

## Commands

| Command                                                       | Purpose                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `inth c15t`                                                   | Ask how to set up c15t in this app, then create or select an Inth project. |
| `inth c15t --codex`, `--claude`, `--cursor`, `--grok`, `--fx` | Start that coding agent here with the c15t setup prompt.                   |
| `inth c15t prompt`                                            | Print the setup prompt for any other agent.                                |
| `inth c15t scaffold`                                          | Write the framework's quickstart files and install the c15t packages.      |
| `inth c15t codemods`                                          | Rewrite v2 source for v3. See [codemods](./commands/codemods.md).          |

Inth owns sign-in, organizations and projects. `inth c15t` asks you to sign in
when it needs an Inth project. See `inth login --help` for browser and email
sign-in.

Add `--json` to any command for one JSON result on stdout. It also turns off
prompts and browser login. `--non-interactive` turns off prompts without
changing the output. Run `inth c15t --help` for the options your installed
version supports.

## Pick a setup path

A coding agent adapts c15t to your existing layout, moves your analytics and
embeds behind consent, and checks the result in a browser. Use it for an app
that already has a root layout and third-party scripts.

`scaffold` writes the framework's quickstart files and leaves the rest of the
app unchanged. It supports `next-app`, `next-pages`, `react`, `javascript`,
`tanstack-start`, `vue`, `nuxt`, `svelte`, `sveltekit`, `solid`, `astro`,
`astro-static` and `html`.

`inth c15t` connects the app to an Inth project. For local mode or a
self-hosted backend, follow your [framework quickstart](https://c15t.com/docs/frameworks)
instead. Remix and Gatsby have no CLI support. Follow the
[React guide](https://c15t.com/docs/frameworks/react/quickstart); see
[Choose your setup](../concepts/choose-your-setup.md) for the rendering mode.

## Next steps

* [Quickstart](./quickstart.md): set up c15t in an existing app.
* [inth c15t](./commands/setup.md): every action and option.
* [Codemods](./commands/codemods.md): migrate v2 source to v3.
