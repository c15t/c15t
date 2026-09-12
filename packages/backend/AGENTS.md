# @c15t/backend

> Self-hosted v3 backend configuration, SQL storage, migrations and HTTP contracts.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Backend quickstart](./docs/self-host/quickstart.md)
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Guides

- [Understand consent state](./docs/guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Data fetching and transports](./docs/guides/data-fetching.md): Choose cached manifests, backend init or offline policy resolution, and understand where consent records are saved.
- [Choose a deployment mode](./docs/guides/deployment-modes.md): Choose who runs your consent backend, then select manifest, init or offline resolution for your deployment.
- [Troubleshoot consent](./docs/guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## Backend

- [Backend configuration](./docs/self-host/api/configuration.md): Configure SQL storage, trusted origins, policies, signing and request logging for a self-hosted v3 backend.
- [HTTP endpoints](./docs/self-host/api/endpoints.md): Use the v3 backend HTTP API for manifests, initialization, consent receipts, identity and legal-document releases.
- [Caching](./docs/self-host/guides/caching.md): Cache public manifests and vendor lists while keeping request-specific initialization and subject state private.
- [Backend database setup](./docs/self-host/guides/database-setup.md): Choose a supported SQL connection and apply migrations with the same configuration as the backend.
- [Deployment runtimes](./docs/self-host/guides/edge-deployment.md): Choose a backend runtime that supports your SQL driver and deploy static or edge-rendered clients against its HTTP endpoint.
- [Mount the backend](./docs/self-host/guides/framework-integration.md): Connect the self-hosted request handler to a server framework and point existing c15t clients at it.
- [IAB backend configuration](./docs/self-host/guides/iab-tcf.md): Publish IAB policy configuration and serve a cached Global Vendor List from a self-hosted c15t backend.
- [Legal-document snapshots](./docs/self-host/guides/legal-document-snapshot-integration.md): Publish legal-document versions and sign evidence of the exact document shown by your application.
- [Request logging](./docs/self-host/guides/observability.md): Inspect failed backend requests, enable request logs and send events to your existing logging pipeline.
- [Policy configuration](./docs/self-host/guides/policy-packs.md): Author and validate the policy rules published by a self-hosted backend manifest.
- [Backend overview](./docs/self-host/overview.md): Understand what the c15t backend provides and choose Inth managed hosting or a self-hosted SQL deployment.
- [Quickstart](./docs/self-host/quickstart.md): Run the consent backend when you need to operate its database, policy and infrastructure yourself.

## Reference

- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
