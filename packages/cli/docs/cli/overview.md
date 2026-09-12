---
title: Overview
description: Inspect and configure c15t projects, manage hosted access, and
  migrate self-hosted databases.
group: cli
---
```bash
c15t --help
c15t setup --help
```

Use the `c15t` executable from your installed `@c15t/cli` package. Pin the CLI release in your dependency manifest and lockfile alongside the c15t release you use. The older executable name `cli` remains available.

## Commands

|Command|Purpose|
|--|--|
|`setup`|Plan or apply an integration for a supported project.|
|`login`, `logout`, `status`|Authenticate with Inth and inspect or clear local credentials.|
|`projects list`, `projects select`, `projects create`|Manage hosted projects and the account default used by setup.|
|`self-host migrate`|Inspect and apply backend database migrations.|
|`codemods`|Run the legacy v1 to v2 transforms.|
|`skills`|Install c15t skills through the external skills CLI.|
|`docs`, `changelog`, `github`|Open a URL interactively or return it without a terminal.|

`generate` is an alias for `setup`. `instances` is an alias for `projects`.

## Framework support

For unpublished v3 development, use [boilerplate generation](./commands/boilerplate). It supports explicit targets for Next.js, React, JavaScript, TanStack Start, Vue/Nuxt, Svelte/SvelteKit, Solid, and Astro. It writes integration files and wiring instructions, with an optional local-package dependency plan.

Setup supports Next.js App Router, Next.js Pages Router, generic React applications with a recognizable application component, and vanilla JavaScript configuration. It selects the exported application component when editing a layout and refuses ambiguous layouts.

Automatic editing of existing application layouts remains limited to the Next.js and React setup paths. For Vue, Nuxt, Svelte, SvelteKit, Solid, Astro, and TanStack Start, generate boilerplate and follow its wiring instructions. Remix and Gatsby require manual integration.

## Choose a workflow

For terminal setup, follow [Quickstart](./quickstart). For scripts, agents, or another CLI, use the [automation contract](./automation). Legacy transforms have a separate [migration reference](./commands/codemods).
