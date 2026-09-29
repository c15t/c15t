---
title: Framework boilerplate
description: Generate c15t integration files and wiring instructions for
  TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid, Astro, React, Next.js or
  JavaScript with the c15t CLI.
group: cli
---

## Generate files for your framework

Pass `--framework` to `setup` to write standalone integration files. The CLI
leaves your entry point, layout and configuration alone and tells you where to
connect the files.

```bash
npx @c15t/cli@alpha setup offline --framework vue --plan --json
npx @c15t/cli@alpha setup offline --framework vue --apply
```

Run it from the app directory, which must contain a `package.json`, or pass
`--cwd path/to/app`. Pick the mode explicitly, either `offline` or `hosted` with
`--backend-url` set to the URL from your Inth project or self-hosted backend.
Offline mode keeps choices in the browser and records nothing on a server. Not
recommended for production environments.

| `--framework`            | Generated files                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next-app`, `next-pages` | Client provider with the stock banner, dialog and a privacy settings link. It initializes in the browser, without server resolution. |
| `react`                  | Provider component with the stock banner, dialog and a privacy settings link.                                                        |
| `javascript`             | Headless runtime with explicit start and dispose.                                                                                    |
| `tanstack-start`         | Request-scoped server function, loader wiring and `ConsentRoot`.                                                                     |
| `vue`, `nuxt`            | App-owned runtime, Vue consent UI and plugin wiring. Nuxt uses a client plugin.                                                      |
| `svelte`, `sveltekit`    | Svelte 5 provider wrapper with app or layout wiring.                                                                                 |
| `solid`                  | App-owned runtime and a basic custom consent interface, without IAB or modal UI.                                                     |
| `astro`                  | Astro integration, head and body components and client script configuration.                                                         |

Use `--boilerplate` without `--framework` to detect the framework from
`package.json`. Pass `--framework` when the CLI cannot tell, such as a Next.js
app without a router layout.

## Install the packages and connect the files

Generation never installs packages. The result lists them under
`data.dependencies`, with each c15t package pinned to the CLI's release line,
and the first instruction gives the install command. From `@c15t/cli@alpha`,
that is the `alpha` dist-tag, for example for Vue:

| Package manager | Command                                                       |
| :-------------- | :------------------------------------------------------------ |
| npm             | `npm install @c15t/vue@alpha @c15t/core@alpha @c15t/ui@alpha` |
| pnpm            | `pnpm add @c15t/vue@alpha @c15t/core@alpha @c15t/ui@alpha`    |
| yarn            | `yarn add @c15t/vue@alpha @c15t/core@alpha @c15t/ui@alpha`    |
| bun             | `bun add @c15t/vue@alpha @c15t/core@alpha @c15t/ui@alpha`     |

Then follow the numbered steps under `data.instructions`. The CLI also writes
them to `README.md` in the output directory. The instructions can mention
`--package-source`; skip that step unless you are testing a local c15t checkout.

## Options

| Option                   | Purpose                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--framework <target>`   | Generate files for this target.                                                                                                                    |
| `--boilerplate`          | Generate files for the detected framework.                                                                                                         |
| `--output <dir>`         | Write files to this project-relative directory. Defaults to `src/consent`.                                                                         |
| `--scripts <ids>`        | Add vendor script examples, as a comma-separated list such as `google-tag,google-tag-manager`. Replace the placeholder IDs before you run the app. |
| `--plan`, `--dry-run`    | Return the files and instructions without writing them.                                                                                            |
| `--apply`, `--yes`       | Write the files.                                                                                                                                   |
| `--resume`               | Restore an interrupted apply, then plan and apply again. Requires `--apply` or `--yes`.                                                            |
| `--package-source <dir>` | Point dependencies at prepared packages from a local c15t checkout. For c15t contributors.                                                         |

Files stay inside the project. An existing file with different contents stops
generation; an identical file is left alone. Setup flags for themes, UI style,
environment files, DevTools, proxy and server resolution do not apply here;
change those in the generated source.

Offline templates start with an opt-in policy. Review its categories before you
deploy.

## Check the result

Run the app's typecheck and build. In a private window, reject optional
categories, reload, and confirm the banner stays closed and optional vendor
requests stay absent in DevTools Network. Open privacy settings, allow a
category, and confirm its vendor requests start.

## Test a local c15t checkout

To try unreleased changes, build the packages the plan lists, prepare local
snapshots from the checkout root, then pass the checkout with
`--package-source`:

```bash
bun turbo run build --filter=@c15t/cli --filter=@c15t/react
bun scripts/prepare-cli-packages.ts @c15t/react
node packages/cli/dist/bin.mjs setup offline --framework react --cwd /path/to/app --package-source "$PWD" --apply
```

The plan then includes `package.json` edits that point at the snapshots.
Install from the app directory afterwards. Keep the snapshot directory while
the app references it, and prepare again after changing package source.
