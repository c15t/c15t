---
title: setup
description: Flags and file handling for c15t setup, which plans and applies
  c15t integration files in Next.js, React and JavaScript apps.
group: cli
---

## Plan and apply

```bash
npx @c15t/cli@alpha setup hosted --backend-url "$C15T_BACKEND_URL" --plan --json
npx @c15t/cli@alpha setup hosted --backend-url "$C15T_BACKEND_URL" --apply --skip-install
```

`C15T_BACKEND_URL` holds the backend URL from your Inth project. Any explicit
flag makes setup non-interactive and returns a read-only plan, even in a
terminal. Add `--apply` or `--yes` to write files.

Install `c15t@alpha` before applying. Setup adds missing packages without a
version, which installs v2 from npm's default tag.

For TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid and Astro, pass
`--framework`. That selects [framework boilerplate](./boilerplate.md),
which has its own options.

## Choose the mode and backend

Pass the mode as the first argument or with `--mode`:

| Mode      | Backend                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hosted`  | Inth or a [self-hosted backend](https://c15t.com/docs/self-host/overview). Requires `--backend-url`, or an Inth project through `--project` or the default set by `projects select`. |
| `offline` | No backend. Choices stay in the browser. Not recommended for production environments.                                                                                                |
| `custom`  | Your own transport.                                                                                                                                                                  |

The older mode names `c15t` and `self-hosted` map to `hosted`. Setup refuses an
Inth project that is still provisioning, because it has no backend URL yet.

## Options

| Option                                          | Purpose                                                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--plan`, `--dry-run`                           | Return the proposed file edits without writing files or installing packages.                                                                                                                                             |
| `--apply`                                       | Write the file edits and install missing packages.                                                                                                                                                                       |
| `--skip-install`                                | Write the file edits without running a package manager.                                                                                                                                                                  |
| `--backend-url <url>`                           | Use this HTTP or HTTPS backend URL.                                                                                                                                                                                      |
| `--project <id or organization/name>`           | Use the backend URL of a signed-in Inth project.                                                                                                                                                                         |
| `--env`                                         | Put the backend URL in an environment file, using the bundler's naming convention.                                                                                                                                       |
| `--proxy`                                       | Add a Next.js rewrite to the hosted backend. Hosted Next.js only.                                                                                                                                                        |
| `--ssr`                                         | Start consent resolution on the server in a hosted Next.js App Router app. The wrapper passes the pending result to the provider, so pages render without waiting for the backend and the banner mounts after hydration. |
| `--devtools`                                    | Include c15t DevTools.                                                                                                                                                                                                   |
| `--ui-style prebuilt` or `expanded`             | Use the stock components or their compound parts. React and Next.js only.                                                                                                                                                |
| `--theme none`, `minimal`, `dark` or `tailwind` | Apply a theme preset. React and Next.js only.                                                                                                                                                                            |
| `--scripts <ids>`                               | Add consent-aware vendor scripts, as a comma-separated list. An unknown ID returns the list of valid IDs.                                                                                                                |
| `--resume`                                      | Recover an interrupted setup.                                                                                                                                                                                            |
| `--debug`                                       | Log setup state transitions.                                                                                                                                                                                             |

Without flags for them, non-interactive setup uses the stock components, no
theme, no scripts, and no environment file, proxy, server resolution or
DevTools. Replace the placeholder IDs in generated script configuration before
you deploy.

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
