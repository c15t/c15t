# @c15t/cli

> c15t v3 setup, codemods, project commands and self-hosted migrations.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find your app's row in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [CLI quickstart](./docs/cli/quickstart.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Upgrade a Next.js app from v2](./docs/frameworks/next/upgrade-v3.md): Upgrade a Next.js app from c15t v2 (@c15t/nextjs) to v3. Covers packages, ConsentRoot or ConsentProvider, the useConsentManager codemod, callbacks, policies, styles, IAB and stored consent.
- [Upgrade a React app from v2](./docs/frameworks/react/upgrade-v3.md): Upgrade a React app from c15t v2 (@c15t/react) to v3. Covers packages, ConsentProvider and transports, the useConsentManager codemod, callbacks, policies, styles, IAB and stored consent.
- [Upgrade a JavaScript app from v2](./docs/frameworks/javascript/upgrade-v3.md): Upgrade a JavaScript app from the c15t v2 store and getOrCreateConsentRuntime to v3. Covers @c15t/browser, createConsentRuntime, the consent kernel, moved exports, callbacks, policies and stored consent.
- [Upgrade a self-hosted backend from v2](./docs/self-host/upgrade-v3.md): Upgrade a self-hosted c15t backend (@c15t/backend) and the Node.js SDK (@c15t/node-sdk) from v2 to v3. Covers the database config, the schema migration, moved backend options, policy rules and the new createC15tClient() client.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

### Next.js

- [Upgrade from v2](./docs/frameworks/next/upgrade-v3.md): Upgrade a Next.js app from c15t v2 (@c15t/nextjs) to v3. Covers packages, ConsentRoot or ConsentProvider, the useConsentManager codemod, callbacks, policies, styles, IAB and stored consent.

### React

- [Upgrade from v2](./docs/frameworks/react/upgrade-v3.md): Upgrade a React app from c15t v2 (@c15t/react) to v3. Covers packages, ConsentProvider and transports, the useConsentManager codemod, callbacks, policies, styles, IAB and stored consent.

### JavaScript

- [Upgrade from v2](./docs/frameworks/javascript/upgrade-v3.md): Upgrade a JavaScript app from the c15t v2 store and getOrCreateConsentRuntime to v3. Covers @c15t/browser, createConsentRuntime, the consent kernel, moved exports, callbacks, policies and stored consent.

## Concepts

- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [Consent categories](./docs/concepts/consent-categories.md): Assign scripts, embeds and features to c15t consent categories, and understand which categories the preference dialog shows.
- [Consent state reference](./docs/concepts/consent-state.md): How c15t saves choices, gates IAB vendors, hydrates server records and keeps browser tabs and storage in step.
- [Data fetching](./docs/concepts/data-fetching.md): Choose the recommended build-time policy snapshot or runtime manifest fetching, backend /init, browser resolution or offline rules, and understand where consent choices are saved.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Policies](./docs/concepts/policies.md): How policy models, prompts and scope decide what c15t asks visitors, where to change the rules, and why a banner may not appear.

## Guides

- [Banner experiments](./docs/guides/banner-experiments.md): Run A/B tests on consent banner presentation with any feature-flag provider or built-in weighted assignment, and attribute every impression and choice to its arm.
- [Troubleshooting](./docs/guides/troubleshooting.md): Fix a missing banner, analytics that load before consent, choices lost on reload, CORS errors, hydration differences and failed static builds in c15t v3.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.

## CLI

- [Agents and automation](./docs/cli/automation.md): Read JSON results from the c15t CLI, call it from another program with runCli, and give a coding agent a v3 setup or migration task.
- [Framework boilerplate](./docs/cli/commands/boilerplate.md): Generate c15t integration files and wiring instructions for TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid, Astro, React, Next.js or JavaScript with the c15t CLI.
- [Codemods](./docs/cli/commands/codemods.md): Migrate source from c15t v2 to v3 with the c15t CLI codemods command, covering the provider, transports, moved exports, dev tools, policy presets, CSS variables, Tailwind CSS 3, callbacks, the Node.js SDK and backend config, and run the v1 to v2 source transforms.
- [Hosted projects and authentication](./docs/cli/commands/hosted.md): Use Inth authentication and provisioning from the c15t setup workflow.
- [Self-hosted migrations](./docs/cli/commands/self-host.md): Plan and apply database migrations for a self-hosted c15t backend with the c15t CLI self-host migrate command.
- [setup](./docs/cli/commands/setup.md): Flags and file handling for c15t setup, which plans and applies c15t integration files in Next.js, React and JavaScript apps.
- [Global flags](./docs/cli/global-flags.md): Flags every c15t CLI command accepts, for JSON output, the project directory, prompts and telemetry, plus exit codes.
- [CLI overview](./docs/cli/overview.md): Run the c15t CLI from @c15t/cli to add c15t to an app, migrate v2 code, manage Inth projects and migrate a self-hosted database.
- [CLI quickstart](./docs/cli/quickstart.md): Use the c15t CLI to plan, review and apply c15t setup in an existing Next.js or React app, connected to an Inth backend.

## Backend

- [Upgrade from v2](./docs/self-host/upgrade-v3.md): Upgrade a self-hosted c15t backend (@c15t/backend) and the Node.js SDK (@c15t/node-sdk) from v2 to v3. Covers the database config, the schema migration, moved backend options, policy rules and the new createC15tClient() client.
