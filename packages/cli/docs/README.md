# @c15t/cli

> c15t v3 setup, codemods, project commands and self-hosted migrations.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Quickstart](./guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Guides

- [Understand consent state](./guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Choose a deployment mode](./guides/deployment-modes.md): Choose backend ownership and request or browser initialization independently.
- [Quickstart](./guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
- [Troubleshoot consent](./guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## CLI

- [Set up c15t with the CLI](./cli/commands/setup.md): Run setup in the target application and review framework and deployment choices.
- [CLI global flags](./cli/global-flags.md): Control help, configuration, logging and telemetry for the installed c15t CLI.
- [c15t command-line tools](./cli/overview.md): Use the CLI for initial setup, migrations and project workflows, then verify the generated integration.
- [Quickstart](./cli/quickstart.md): Run the locally installed v3 CLI and review setup changes before deploying.

## Reference

- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
