---
title: Hosted projects and authentication
description: Use Inth authentication and provisioning from the c15t setup workflow.
group: cli
---

`@c15t/cli` includes a pinned `@inth/cli` dependency. c15t delegates login,
logout, account status, and hosted project operations to Inth's native
executable. A separate global Inth installation is not required.

```bash
c15t login
c15t projects list --json
```

Inth owns browser sign-in, saved connections, credential storage, organization
selection, and token refresh. An existing Inth session works with c15t. For
unattended setup, use an existing connection or an organization API key through
`INTH_TOKEN`. `--no-browser` passes the browser preference to Inth. `--json`
disables interactive login; c15t does not start a separate device grant.

## Account status and logout

```bash
c15t status --json
c15t logout
```

Status reports credential presence and local expiry, not remote session
validity. Inth validates or refreshes credentials when making project requests.
Logout delegates to Inth and signs out the connection selected there. c15t
never reads or returns Inth's access tokens, refresh tokens, or API keys.

Older c15t credentials in `~/.c15t/config.json` are no longer read or migrated.
Sign in through Inth once if you only have that legacy session. Existing
credential files remain untouched. Control-plane and connection configuration
now belong to Inth; `CONSENT_URL` no longer configures account operations.

## Select a project

```bash
c15t projects select <project-id> --json
```

Inth resolves the organization from its nearest application link or selected
account default. c15t lists all project pages in that organization. Select an
ID or an unambiguous name. Selection saves only the public project ID in
`.c15t/project.json` inside the directory selected by `--cwd` or the current
working directory. It applies to that application, not the entire account.
Run project selection from the same application directory you use for setup.

Use `--project` in setup to override this preference. Explicit
`--backend-url` and offline setup do not require Inth account access.

## Create a project

```bash
c15t projects create my-project --organization <organization-id> --region <region-id> --json
```

Interactive creation asks for a project name, organization, and available
region. An explicit organization may be its ID or slug. c15t invokes Inth's
current `project create` command with c15t branding and selects the returned
project for this application. Region discovery has no legacy v2 filtering.

A newly created project's consent backend may still be pending. Setup requires
`consent.backendUrl` from the project response. It never substitutes a dashboard
URL. Project data and account errors stay within c15t's versioned JSON result.

Inth distributes native executables for macOS arm64, Linux arm64/x64, and Windows
x64. Install optional dependencies so the matching executable is available.
The shared c15t generation and agent modules do not import or execute Inth;
embedded hosts continue to supply their own configuration.
