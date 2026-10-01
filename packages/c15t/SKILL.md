---
name: c15t
description: Set up, customize or debug c15t consent management with the c15t umbrella package. Use when the project uses c15t with Next.js, React, TanStack Start, Vue, Nuxt, Astro or plain JavaScript, or when a task mentions a cookie banner, consent dialog, GDPR or CCPA prompts, blocking analytics until consent, Google Consent Mode or IAB TCF.
---

# c15t (umbrella package)

The Markdown under `./docs` matches the installed version. Read it before writing code: v3 renamed most v2 APIs, so remembered examples are usually wrong.

## Before writing code

1. Find the framework, router, rendering mode (server, static or single-page) and host in the project.
2. Pick the matching row in [Choose your setup](./docs/concepts/choose-your-setup.md).
3. Follow that guide from start to finish: [Next.js](./docs/frameworks/next/quickstart.md), [TanStack Start](./docs/frameworks/tanstack-start/quickstart.md), [React](./docs/frameworks/react/quickstart.md), [Nuxt](./docs/frameworks/nuxt/quickstart.md), [Vue](./docs/frameworks/vue/quickstart.md), [Astro](./docs/frameworks/astro/quickstart.md), [Svelte](./docs/frameworks/svelte/quickstart.md), [SvelteKit](./docs/frameworks/sveltekit/quickstart.md), [HTML script tag](./docs/frameworks/html/quickstart.md), [JavaScript](./docs/frameworks/javascript/quickstart.md).

## Rules

- Install with the `alpha` tag: `npm install c15t@alpha` and import the framework subpath, such as `c15t/next`. npm `latest` is still v2. Keep every c15t package on the same release.
- The backend URL comes from the user's Inth project or self-hosted backend. It is public configuration. Never invent one; ask for it or read it from the environment.
- Register analytics, pixels and embeds through c15t and remove the vendor's own loader or plugin. With a bundler, use `@c15t/integrations` helpers and `ConsentGate`. On a plain HTML page, change the vendor's `<script>` to `type="text/plain"` with `data-c15t-category`. A banner does not block code loaded elsewhere.
- Gate features on the current permission. Never save a consent choice on page load or from code; only a visitor action records one.
- Offline mode keeps policies in code and choices in the browser, with no consent records. Not recommended for production environments.
- Keep one consent provider or root for the whole app, mounted outside route-level components.

## Customize with the smallest change

Copy and languages use i18n configuration. Position and layout use component props. Colors, type, radius and spacing use theme tokens. One part of a component uses slots. Different markup uses compound or headless components.
Start at [Customization overview](./docs/customization/overview.md).

## Finish with a check

A visible banner proves nothing. In a production build, confirm vendor requests are absent before consent, a rejection survives a reload, and preferences reopen. Follow [Verify consent before shipping](./docs/guides/verify-consent.md). If something fails, start with [Troubleshooting](./docs/guides/troubleshooting.md).

`./AGENTS.md` lists every bundled page.
