---
title: CLI quickstart
description: Use the c15t CLI to plan, review and apply c15t setup in an
  existing Next.js or React app, connected to an Inth backend.
group: cli
---

## Plan the setup

Run setup from the app directory with your Inth backend URL. Replace
`https://your-project.inth.app` with the URL from your Inth project, including
any path prefix:

```bash
npx @c15t/cli@alpha setup hosted --backend-url https://your-project.inth.app --plan --json
```

`--plan` writes nothing and installs nothing. The JSON result lists each file
the CLI would create or change under `data.edits`, with its current and
proposed contents, and the packages it would install under
`data.dependencies`. Pass `--cwd path/to/app` to run from another directory.

With `--backend-url`, setup does not sign in to Inth, so it works on every
platform. To choose a project from your Inth account instead, sign in with
`c15t login` and see [hosted projects](./commands/hosted.md).

## Apply the setup

When the plan looks right, apply it:

```bash
npx @c15t/cli@alpha setup hosted --backend-url https://your-project.inth.app --apply
```

For a Next.js App Router app, setup adds a client provider component under
`components/consent-manager/` and wraps `{children}` in your root layout with it.
The provider renders the stock banner and preferences dialog.

Setup installs the c15t packages it needs, such as `c15t` and
`@c15t/integrations`, from the CLI's own release line, so `@c15t/cli@alpha`
installs `c15t@alpha`. It keeps packages
that are already in `package.json`. Add `--skip-install` when your workspace
tooling installs dependencies, and install `c15t@alpha` yourself.

Setup refuses to overwrite a generated component that you have edited. To
change an existing integration, edit its files rather than running setup again.

## Answer prompts instead

```bash
npx @c15t/cli@alpha setup
```

In a terminal, setup asks for the backend mode, UI style, theme and scripts.
Without a terminal, pass the mode and inputs as flags; the CLI does not guess
missing values. See [setup](./commands/setup.md) for every flag.

## Setup with Codex

Let your installed Codex CLI adapt the integration to an existing application:

```bash
npx @c15t/cli@alpha setup --codex hosted --backend-url https://your-project.inth.app
```

Replace the URL with your Inth project's backend URL. The agent receives the
c15t v3 frontend task, installs required packages from `@alpha`, and reads their
bundled docs. Add `--plan` to inspect the prompt before launching Codex. See
[agent setup](./automation.md#agent-setup-and-v3-migration-workflow).

## Check the result

1. Run your app's typecheck and build.
2. Open the app in a private window. The banner appears for a visitor your Inth
   policy asks to choose.
3. Replace any integration ID placeholders the CLI left in the provider, then
   check in DevTools Network that those vendor requests wait until you accept.
4. Reject, reload, and confirm the banner stays closed and the vendor requests
   stay absent.

The [verification guide](../guides/verify-consent.md) covers the full release
checklist. For server rendering and other recipes, continue with your
[framework quickstart](https://c15t.com/docs/frameworks).
