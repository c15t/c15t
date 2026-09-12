# @c15t/cli

> c15t v3 setup, codemods, project commands and self-hosted migrations.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [CLI quickstart](./cli/quickstart.md)
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Guides

- [Understand consent state](./guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Data fetching and transports](./guides/data-fetching.md): Choose cached manifests, backend init or offline policy resolution, and understand where consent records are saved.
- [Choose a deployment mode](./guides/deployment-modes.md): Choose who runs your consent backend, then select manifest, init or offline resolution for your deployment.
- [Troubleshoot consent](./guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## CLI

- [Agents and automation](./cli/automation.md): Use structured CLI results and version-matched documentation from agents, scripts, and other CLIs.
- [V3 boilerplate](./cli/commands/boilerplate.md): Generate framework integration files using unpublished local v3 packages.
- [Legacy codemods](./cli/commands/codemods.md): Preview and run explicit v1 to v2 source transforms.
- [Hosted projects and authentication](./cli/commands/hosted.md): Authenticate with Inth and select or create a hosted consent project.
- [Self-hosted migrations](./cli/commands/self-host.md): Plan and apply the database migrations for an existing backend configuration.
- [setup](./cli/commands/setup.md): Plan and apply c15t integration files from terminal prompts or explicit inputs.
- [Global flags](./cli/global-flags.md): Control CLI output, project location, prompts, and telemetry.
- [Overview](./cli/overview.md): Inspect and configure c15t projects, manage hosted access, and migrate self-hosted databases.
- [Quickstart](./cli/quickstart.md): Review the proposed integration before applying it to your application.

## Reference

- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
