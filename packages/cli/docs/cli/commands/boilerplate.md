---
title: Framework boilerplate
description: Generate the c15t quickstart files for Next.js, Nuxt, TanStack
  Start, Astro, React, JavaScript, a script tag, Vue, Svelte, SvelteKit or Solid
  with the c15t CLI.
group: cli
---

## Generate files for your framework

Pass `--framework` to `setup` to write your framework's quickstart: the same
files the [framework quickstarts](https://c15t.com/docs/frameworks) show, at the same paths.

```bash
npx @c15t/cli@alpha setup hosted --framework react --backend-url https://your-project.inth.app --plan --json
npx @c15t/cli@alpha setup hosted --framework react --backend-url https://your-project.inth.app --apply
```

Run it from the app directory, which must contain a `package.json`, or pass
`--cwd path/to/app`. Pick the mode explicitly. `hosted` takes `--backend-url`,
the URL from your Inth project or self-hosted backend, and writes it to `.env`
under the framework's public env var. Offline mode resolves the recommended
policy in the browser, writes no `.env`, and records nothing on a server. Not
recommended for production environments.

| `--framework`    | Generated files                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `next-app`       | `.env`, `next.config.ts`, `c15t.config.ts`, `app/layout.tsx`                                                                                    |
| `next-pages`     | `.env`, `next.config.ts`, `c15t.config.ts`, `pages/_app.tsx`, `pages/api/c15t/[...c15t].ts`, `pages/index.tsx`                                  |
| `nuxt`           | `.env`, `nuxt.config.ts`, `app/app.vue`, and `app/app.config.ts` with `--scripts`                                                               |
| `tanstack-start` | `.env`, `vite.config.ts`, `src/routes/__root.tsx`                                                                                               |
| `astro`          | Server output: `.env`, `astro.config.mjs`, `src/layouts/base.astro`, and `src/c15t.client.ts` with `--scripts`                                  |
| `astro-static`   | Static output, with `hosted()`: the same files as `astro`                                                                                       |
| `react`          | React with Vite: `.env`, `vite.config.ts`, `src/consent.tsx`, `src/main.tsx`                                                                    |
| `javascript`     | `.env`, `vite.config.ts`, `src/main.ts`, and a privacy settings link in `index.html`                                                            |
| `html`           | The `c15t.js` script tag and a privacy settings link in `index.html`. Hosted mode only.                                                         |
| `vue`            | Vue with Vite: `.env`, `vite.config.ts`, `src/main.ts`, `src/App.vue`                                                                           |
| `svelte`         | Svelte with Vite: `.env`, `vite.config.ts`, `src/App.svelte`                                                                                    |
| `sveltekit`      | `.env`, `vite.config.ts`, the locals type in `src/app.d.ts`, `src/hooks.server.ts`, `src/routes/+layout.server.ts`, `src/routes/+layout.svelte` |
| `solid`          | `src/consent/`: an app-owned runtime and a basic custom consent interface, without IAB or modal UI                                              |

| Env var                        | Frameworks                                               |
| ------------------------------ | -------------------------------------------------------- |
| `NEXT_PUBLIC_C15T_BACKEND_URL` | `next-app`, `next-pages`                                 |
| `NUXT_PUBLIC_C15T_BACKEND_URL` | `nuxt`                                                   |
| `PUBLIC_C15T_BACKEND_URL`      | `astro`, `astro-static`, `sveltekit`                     |
| `VITE_C15T_BACKEND_URL`        | `tanstack-start`, `react`, `javascript`, `vue`, `svelte` |

Use `--boilerplate` without `--framework` to detect the framework from
`package.json`. An Astro project with a server adapter gets `astro`, and one
without gets `astro-static`. A Next.js project needs an existing router layout
to pick `next-app` or `next-pages`; when its layout is under `src/`, the `app/`
and `pages/` files go there too. Pass `--framework` when the CLI cannot tell.

## Existing files

An identical file is left alone. An existing `.env` keeps its other keys: the
CLI adds the backend URL, or updates that one key if it is already set. The
CLI never creates or edits `.gitignore`. In an existing `index.html` it adds
the script tag or privacy settings link, and in an existing `src/app.d.ts` the
locals type. An existing `pages/index.tsx` is left alone; add
`getServerSideProps` to the pages that need it.

Any other existing file with different contents, such as your own
`vite.config.ts` or root layout, stops generation before anything is written.
The error lists those files. Merge the quickstart into them by hand, or pass
`--overwrite` to replace them.

## Install the packages

Generation never installs packages. The result lists them under
`data.dependencies`, with each c15t package pinned to the CLI's release line.
From `@c15t/cli@alpha`, that is the `alpha` dist-tag, for example for React:

| Package manager | Command                  |
| :-------------- | :----------------------- |
| npm             | `npm install c15t@alpha` |
| pnpm            | `pnpm add c15t@alpha`    |
| yarn            | `yarn add c15t@alpha`    |
| bun             | `bun add c15t@alpha`     |

`data.instructions` lists the remaining steps. They can mention
`--package-source`; skip that step unless you are testing a local c15t checkout.

## Options

| Option                   | Purpose                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--framework <target>`   | Generate files for this target.                                                                                                                 |
| `--boilerplate`          | Generate files for the detected framework.                                                                                                      |
| `--scripts <ids>`        | Add vendor script examples, as a comma-separated list such as `posthog,google-tag-manager`. Replace the placeholder IDs before you run the app. |
| `--overwrite`            | Replace existing files whose contents differ from the quickstart.                                                                               |
| `--plan`, `--dry-run`    | Return the files and instructions without writing them.                                                                                         |
| `--apply`, `--yes`       | Write the files.                                                                                                                                |
| `--resume`               | Restore an interrupted apply, then plan and apply again. Requires `--apply` or `--yes`.                                                         |
| `--package-source <dir>` | Point dependencies at prepared packages from a local c15t checkout. For c15t contributors.                                                      |

Files stay inside the project. `--output` was removed: every file goes to its
quickstart path. Setup flags for themes, UI style, DevTools, proxy and server
resolution do not apply here; change those in the generated source. JSON
results show `.env` edits without their contents.

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
bun turbo run build --filter=@c15t/cli --filter=c15t...
bun scripts/prepare-cli-packages.ts c15t
node packages/cli/dist/bin.mjs setup offline --framework react --cwd /path/to/app --package-source "$PWD" --apply
```

The plan then includes `package.json` edits that point at the snapshots.
Install from the app directory afterwards. Keep the snapshot directory while
the app references it, and prepare again after changing package source.
