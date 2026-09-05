---
title: Quickstart
description: Scaffold consent management into a React or Next.js app in under 2 minutes.
group: cli
---
## Run setup

The fastest path is the interactive `setup` command. It detects your framework, installs the right packages, configures the client, and drops in a banner + dialog.

```bash
pnpm dlx @c15t/cli setup
# or: npx @c15t/cli setup
# or: bunx --bun @c15t/cli setup
```

You'll be asked:

1. Which framework you're using (React, Next.js, or vanilla JavaScript).
2. Whether you want a hosted instance (inth.com) or self-hosted backend.
3. Where to write configuration files.

The CLI then:

* Installs the single `c15t` package; generated code imports `c15t/react`, `c15t/next`, or `c15t` depending on your framework.
* Adds the prebuilt stylesheet import to your app's CSS entrypoint.
* Creates a `ConsentProvider` wrapper component with `ConsentBanner` and `ConsentDialog`.
* Writes any required environment variables.

When it finishes, run your dev server — the banner appears on first visit.

## What if I'm migrating from v1?

Use `codemods` after upgrading the package versions. It rewrites legacy APIs (`CookieBanner` → `ConsentBanner`, `gdprTypes` → `consentCategories`, etc.) automatically.

```bash
pnpm dlx @c15t/cli codemods
```

See the [codemods reference](./commands/codemods) for the full list.

## Self-hosted next steps

If you chose self-hosted during setup, run database migrations next:

```bash
pnpm dlx @c15t/cli self-host migrate
```

See [self-hosted quickstart](/docs/self-host/quickstart) for adapter-specific guidance.
