---
title: Hosted projects and authentication
description: Authenticate with Inth and select or create a hosted consent project.
group: cli
---
```bash
c15t login
c15t projects list --json
```

Login uses a browser device flow. `--no-browser` prints the verification instructions without launching a browser. Device login needs a person to approve access; unattended callers must already have valid credentials.

## Local authentication state

```bash
c15t status --json
c15t logout
```

Credentials are stored in `~/.c15t/config.json` and scoped to the control-plane origin. Files are written atomically with owner-only permissions. Logout removes local credentials even if they have expired. Status checks local credential state, not remote token revocation. Expired sessions require another device login; automatic refresh is not implemented.

`CONSENT_URL` overrides the control-plane base URL. Credentials from a different origin are not sent to that URL. Signing into another origin or account replaces the local session and clears its selected project.

## Select a project

```bash
c15t projects select my-org/my-project --json
```

Selection sets an account-wide default used by setup. It is not a repository link. Use `--project` in setup to choose a different project explicitly. Bare project names must be unambiguous; prefer an ID or `organization/name`.

## Create a project

```bash
c15t projects create my-project --organization my-org --region us-east-1 --json
```

Supply a region available to your organization. Interactive creation lists available organizations and provisioning regions. Creation produces a development project and selects it as the default. Enable production mode through the Inth dashboard.

A newly created project may be pending. Setup refuses projects without a provisioned backend URL. The CLI does not expose project deletion, deployment, or domain-management commands.
