---
title: CLI quickstart
description: Use inth c15t from the Inth CLI to set up c15t in an existing app
  with a coding agent or quickstart files, connected to an Inth project.
group: cli
---

## Install and sign in

Install the Inth CLI, then sign in:

```bash
curl -fsSL https://inth.com/cli/install.sh | sh
inth login
```

On Windows, or to use npm, run `npm install -g @inth/cli` instead. See
[install the Inth CLI](./overview.md#install-the-inth-cli).

## Set up with a coding agent

Run `inth c15t` from the app directory and pick your agent, or name it:

```bash
inth c15t --codex
```

`--claude`, `--cursor`, `--grok` and `--fx` start the other supported agents.
`inth c15t` asks you to select an Inth project or create one, then starts the
agent with the c15t setup prompt and the project's backend URL. The agent
inventories the app and its analytics, pixels and embeds, installs c15t,
moves every vendor behind consent and checks the result in a browser.

Pass the project to skip the question:

```bash
inth c15t --codex --project my-project
```

To create a project instead, pass `--name my-project --region <id>`.
`inth region list` lists the regions.

If your agent isn't installed on this machine, print the prompt and paste it
into the agent:

```bash
inth c15t prompt --project my-project > c15t-prompt.md
```

## Write the quickstart files instead

`scaffold` writes the framework's quickstart files and installs the c15t
packages. Preview the files first:

```bash
inth c15t scaffold --project my-project --framework next-app --dry-run
```

When the list looks right, write them:

```bash
inth c15t scaffold --project my-project --framework next-app
```

The project's backend URL goes into `.env` under the framework's public
variable, such as `NEXT_PUBLIC_C15T_BACKEND_URL`. Add `--skip-install` when
your workspace tooling installs dependencies, and install `c15t` yourself.
`scaffold` prints instructions for any file it couldn't wire up, such as a root
component with a different name.

## Check the result

1. Run your app's typecheck and build.
2. Open the app in a private window. The banner appears for a visitor your Inth
   policy asks to choose.
3. Check in DevTools Network that vendor requests wait until you accept.
4. Reject, reload, and confirm the banner stays closed and the vendor requests
   stay absent.

The [verification guide](../guides/verify-consent.md) covers the full release
checklist. For server rendering and other recipes, continue with your
[framework quickstart](https://c15t.com/docs/frameworks).
