---
name: c15t-core
description: Set up, customize or debug c15t consent management with @c15t/core. Use when the project uses the headless c15t engine, `createConsentRuntime` or custom consent UI, or when a task mentions a cookie banner, consent dialog, GDPR or CCPA prompts, blocking analytics until consent, Google Consent Mode or IAB TCF.
---

# c15t with @c15t/core

The Markdown under `./docs` matches the installed version. Read it before writing code: v3 renamed most v2 APIs, so remembered examples are usually wrong.

## Before writing code

1. Find the framework, router, rendering mode (server, static, cached or single-page) and host in the project. Check the framework config and route files for settings that prerender or cache pages.
2. Pick the matching row in [Choose your setup](./docs/concepts/choose-your-setup.md).
3. Follow that guide from start to finish: [JavaScript](./docs/frameworks/javascript/quickstart.md).

## Rules

- Install with the `alpha` tag: `npm install c15t@alpha`. npm `latest` is still v2. Keep every c15t package on the same release. New apps install `c15t` and import its framework subpath. An app that already depends on this scoped package can keep importing from it, but should not install both.
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
