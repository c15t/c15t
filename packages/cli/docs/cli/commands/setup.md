---
title: setup
description: Flags and file handling for c15t setup, which plans and applies
  c15t integration files in Next.js, React and JavaScript apps.
group: cli
---

## Plan and apply

```bash
npx @c15t/cli@alpha setup hosted --backend-url https://your-project.inth.app --plan --json
npx @c15t/cli@alpha setup hosted --backend-url https://your-project.inth.app --apply --skip-install
```

Replace `https://your-project.inth.app` with the backend URL from your Inth
project. Any explicit flag makes setup non-interactive and returns a read-only
plan, even in a terminal. Add `--apply` or `--yes` to write files.

Setup installs missing c15t packages from the CLI's release line. A prerelease
CLI uses its dist-tag, so `@c15t/cli@alpha` installs `c15t@alpha`. A stable CLI
uses its major version, such as `c15t@3`. A c15t package already in
`package.json` stays as it is when its range can resolve to that release line.
A range on another major, such as `^2`, is installed again from the CLI's
line.

For TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid and Astro, pass
`--framework`. That selects [framework boilerplate](./boilerplate.md),
which has its own options.

## Setup with Codex

Use `setup --codex` to give your installed Codex CLI the default c15t v3
frontend task. Add `--plan --json` to inspect the prompt without launching it.
With `--plan` or `--dry-run`, the CLI prints the prompt, copies it to your
clipboard and confirms the copy. If clipboard access fails, copy the printed
prompt manually. `--json` exports the prompt without accessing the clipboard.
See [agent setup](../automation.md#agent-setup-and-v3-migration-workflow)
for inputs and requirements. `generate` keeps the deterministic setup workflow.

## Choose the mode and backend

Pass the mode as the first argument or with `--mode`:

| Mode      | Backend                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hosted`  | Inth or a [self-hosted backend](https://c15t.com/docs/self-host/overview). Requires `--backend-url`, or an Inth project through `--project` or the application preference set by `projects select`. |
| `offline` | No backend. Choices stay in the browser. Not recommended for production environments.                                                                                                               |
| `custom`  | Your own transport.                                                                                                                                                                                 |

The older mode names `c15t` and `self-hosted` map to `hosted`. Setup refuses an
Inth project that is still provisioning, because it has no backend URL yet.

## Options

| Option                                          | Purpose                                                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--plan`, `--dry-run`                           | Return the proposed file edits without writing files or installing packages.                                                                                                                                             |
| `--apply`                                       | Write the file edits and install missing packages.                                                                                                                                                                       |
| `--skip-install`                                | Write the file edits without running a package manager.                                                                                                                                                                  |
| `--backend-url <url>`                           | Use this HTTP or HTTPS backend URL.                                                                                                                                                                                      |
| `--project <id, name or organization/name>`     | Use the backend URL of a signed-in Inth project.                                                                                                                                                                         |
| `--proxy`                                       | Add a Next.js rewrite to the hosted backend. Hosted Next.js only.                                                                                                                                                        |
| `--ssr`                                         | Start consent resolution on the server in a hosted Next.js App Router app. The wrapper passes the pending result to the provider, so pages render without waiting for the backend and the banner mounts after hydration. |
| `--devtools`                                    | Include c15t DevTools.                                                                                                                                                                                                   |
| `--ui-style prebuilt` or `expanded`             | Use the stock components or their compound parts. React and Next.js only.                                                                                                                                                |
| `--theme none`, `minimal`, `dark` or `tailwind` | Apply a theme preset. React and Next.js only.                                                                                                                                                                            |
| `--scripts <ids>`                               | Add consent-aware vendor scripts, as a comma-separated list. An unknown ID returns the list of valid IDs.                                                                                                                |
| `--resume`                                      | Recover an interrupted setup.                                                                                                                                                                                            |
| `--debug`                                       | Log setup state transitions.                                                                                                                                                                                             |

Without flags for them, non-interactive setup uses the stock components, no
theme, no scripts, and no proxy, server resolution or DevTools. Replace the
placeholder IDs in generated script configuration before you deploy.

## Set up styles and Tailwind CSS

In React and Next.js apps, setup adds c15t's `styles.css` import to your
global CSS entry. With Tailwind CSS 3 it also:

* Puts the import above the `@tailwind` directives, and replaces a
  `styles.tw3.css` import from an earlier setup.
* Adds the plugin from the package it installed, such as
  `c15t/postcss-tailwind3`, before `tailwindcss` in your PostCSS config. It
  edits one `postcss.config.*` or `.postcssrc*` file, in either the object or
  the array form, and leaves a config that already runs a c15t
  `postcss-tailwind3` plugin alone.

Setup prints the PostCSS change to make by hand when it finds no config, finds
several config files, finds the config in the `postcss` key of `package.json`,
or cannot edit the plugin list, such as a YAML file. A non-interactive run
logs these warnings and lists them in `warnings` in its result.
[Tailwind CSS](https://c15t.com/docs/customization/tailwind#set-up-tailwind-css-3) shows the
finished setup.

Create React App ignores PostCSS config files, so Tailwind 3 cannot run the
plugin and the build fails on c15t's dialog stylesheet. Setup warns about
this. Add the plugin before `tailwindcss` through CRACO, eject, or move the app
to Vite.

## How setup changes files

The plan holds each file's current and proposed text. When applying, setup
checks that each file still matches the current text before writing it. If
writing fails, setup restores the files it already changed and reports any file
it could not restore. It never overwrites a change another process made after
the plan.

Symlinks are allowed when their targets stay inside the project. Planning
rejects dangling symlinks and symlinks that point outside the project.

Installing packages is a separate step from writing files. If the install
fails, setup restores the generated files, but changes the package manager made
to `package.json`, the lockfile or `node_modules` can remain.

An interrupted apply leaves a `.c15t-generation.json` recovery file. `--resume`
restores the files from it and plans again. If a file changed since the
interruption, recovery stops so you can review it. A non-interactive resume
needs `--apply` or `--yes`, and cannot be combined with `--plan` or `--dry-run`.
