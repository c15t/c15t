---
title: Quickstart
description: Run the locally installed v3 CLI and review setup changes before deploying.
group: cli
---

## Install a compatible CLI version

Select the exact `@c15t/cli` v3 release that matches your package rollout and
install it as a development dependency. The commands below use the locally
installed executable, so they do not silently select a different release.

```bash
bun run cli --version
bun run cli --help
bun run cli setup
```

Run setup from the application directory, especially in a monorepo. Connect the
result to your [Inth project](../guides/inth.md). Review the detected framework,
package manager, router, files and backend URL before applying generated changes.

The package exports the executable as `cli`. `bun run cli` selects that local
binary; it does not fetch a new CLI release.

## Review the result

Check the diff, import the correct stylesheet and confirm a persistent
preferences entry point. A setup command cannot discover every vendor installed
through your CMS, tag manager or hosting platform. Inventory those separately.

For static deployments, verify that generated configuration uses reachable
external URLs rather than a nonexistent local API route. Follow
[verification](../guides/verify-consent.md) before shipping.
