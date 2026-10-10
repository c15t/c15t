# @c15t/backend

> Self-hosted v3 backend configuration, SQL storage, migrations and HTTP contracts.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find your app's row in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [Backend quickstart](./docs/self-host/quickstart.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate to v3](./docs/upgrade-v3.md): Upgrade from c15t v2 to v3. Pick the guide for the v2 package you use (@c15t/nextjs, @c15t/react or the c15t store), rename @c15t/scripts, keep visitors' choices, and upgrade a self-hosted backend and the Node.js SDK.

## More documentation

[Documentation index](https://v3.c15t.com/docs/llms.txt) · [Full Markdown context](https://v3.c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

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

## Backend

- [Backend configuration](./docs/self-host/api/configuration.md): Options for a self-hosted c15t backend in c15t-backend.config.ts and c15tInstance, covering SQL storage, trusted origins, policies, signing, script routes and request logging.
- [HTTP endpoints](./docs/self-host/api/endpoints.md): HTTP endpoints of a self-hosted c15t v3 backend for the manifest, /init, session reports, consent saves, identity links, the script tag and legal-document releases.
- [Node.js SDK](./docs/self-host/api/node-sdk.md): Call the c15t consent API from server code with @c15t/node-sdk. Check consent before sending email, link users after sign-in, export a user's records, publish legal documents from CI and read experiment results.
- [Caching](./docs/self-host/guides/caching.md): Cache public manifests and vendor lists while keeping request-specific initialization and subject state private.
- [Backend database setup](./docs/self-host/guides/database-setup.md): Connect a self-hosted c15t backend to PostgreSQL, MySQL or SQLite, apply migrations, and upgrade a v2 backend database.
- [Deployment runtimes](./docs/self-host/guides/edge-deployment.md): Choose a backend runtime that supports your SQL driver and deploy static or edge-rendered clients against its HTTP endpoint.
- [IAB backend configuration](./docs/self-host/guides/iab-tcf.md): Publish an IAB TCF policy and serve a cached Global Vendor List from a self-hosted c15t backend.
- [Legal-document snapshots](./docs/self-host/guides/legal-document-snapshot-integration.md): Publish legal-document versions and sign evidence of the exact document shown by your application.
- [Request logging](./docs/self-host/guides/observability.md): Inspect failed backend requests, enable request logs and send events to your existing logging pipeline.
- [Policy configuration](./docs/self-host/guides/policy-packs.md): Author and validate the policy rules published by a self-hosted backend manifest.
- [Backend overview](./docs/self-host/overview.md): What the c15t consent backend does, and when to use Inth or run @c15t/backend yourself with your own SQL database.
- [Self-host the backend](./docs/self-host/quickstart.md): Run the c15t consent backend yourself with @c15t/backend, create its database schema with the CLI, mount it in Next.js, TanStack Start, Nuxt, SvelteKit or another server, and point your app at it.

## Reference

- [Migrate to v3](./docs/upgrade-v3.md): Upgrade from c15t v2 to v3. Pick the guide for the v2 package you use (@c15t/nextjs, @c15t/react or the c15t store), rename @c15t/scripts, keep visitors' choices, and upgrade a self-hosted backend and the Node.js SDK.
