# @c15t/backend

> Self-hosted c15t backend docs for configuration, APIs, storage, policy packs, and operations.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Self Host

Run the c15t backend, configure storage, and operate consent infrastructure.

- [API Endpoints](./docs/self-host/api/endpoints.md): Full reference for every c15t consent backend endpoint.
- [Database Setup](./docs/self-host/guides/database-setup.md): Configure a database adapter for your self-hosted c15t backend.
- [Quickstart](./docs/self-host/quickstart.md): Self-host the c15t consent management backend in your own infrastructure.

## Other

- [Backend configuration](./docs/self-host/api/configuration.md): Configure the database, manifest and HTTP options on c15tInstance.
- [Manifest delivery at the edge](./docs/self-host/guides/edge-deployment.md): Deliver a versioned manifest while retaining origin receipt and privacy endpoints.
- [Backend policy rules](./docs/self-host/guides/policy-packs.md): Configure behavior rules and negotiate the v3 wire contract.
- [Upgrade to v3](./docs/upgrade-v3.md): Migrate choices, processing gates, policy rules, presentation and transports to the v3 contract.
