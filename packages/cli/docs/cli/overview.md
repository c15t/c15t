---
title: Overview
description: Run the c15t CLI from @c15t/cli to add c15t to an app, migrate v2
  code, manage Inth projects and migrate a self-hosted database.
group: cli
---

## Run the CLI

The CLI ships as `@c15t/cli`. Its v3 release uses the `alpha` dist-tag, like the
other c15t packages. Run it without installing:

```bash
npx @c15t/cli@alpha --help
```

`bunx @c15t/cli@alpha`, `pnpm dlx @c15t/cli@alpha` and `yarn dlx @c15t/cli@alpha`
work the same way. Keep `@alpha`; without it, npm resolves the v2 CLI.

To pin the version in your repository, install it as a development dependency
and run the `c15t` executable:

| Package manager | Command                          |
| :-------------- | :------------------------------- |
| npm             | `npm install -D @c15t/cli@alpha` |
| pnpm            | `pnpm add -D @c15t/cli@alpha`    |
| yarn            | `yarn add -D @c15t/cli@alpha`    |
| bun             | `bun add -D @c15t/cli@alpha`     |

```bash
npx c15t --help
```

The package also installs the executable under its older name, `cli`.

## Commands

| Command                                               | Purpose                                                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `setup`                                               | Add c15t to a Next.js or React app, or generate framework files for any supported framework. `generate` is an alias. |
| `codemods`                                            | Rewrite `useConsentManager()` calls for v3, or run the v1 to v2 transforms.                                          |
| `login`, `logout`, `status`                           | Sign in to Inth, and inspect or clear local credentials.                                                             |
| `projects list`, `projects select`, `projects create` | Manage Inth projects and the default project used by setup. `instances` is an alias.                                 |
| `self-host migrate`                                   | Plan and apply database migrations for a self-hosted backend.                                                        |
| `skills`                                              | Install c15t agent skills through the external skills CLI.                                                           |
| `docs`, `changelog`, `github`                         | Open the URL in a browser, or print it when there is no terminal.                                                    |

Run `npx @c15t/cli@alpha <command> --help` for a command's options.

## Pick the right command for your framework

`setup` edits an existing app layout for Next.js App Router, Next.js Pages Router
and React apps with a recognizable root component. It also writes configuration
for plain JavaScript. See [setup](./commands/setup.md).

For TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid and Astro, `setup` with
`--framework` writes integration files and wiring instructions, and leaves your
entry point unchanged. See [framework boilerplate](./commands/boilerplate.md).

Remix and Gatsby have no CLI support. Follow the
[JavaScript quickstart](https://c15t.com/docs/frameworks/javascript/quickstart) instead.

## Next steps

* [Quickstart](./quickstart.md): plan and apply setup in an existing app.
* [Codemods](./commands/codemods.md): migrate `useConsentManager()` to v3 hooks.
* [Agents and automation](./automation.md): JSON results and calling the CLI from code.
