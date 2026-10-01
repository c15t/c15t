---
packages:
  '@c15t/cli': minor
---

### Delegate hosted account operations to Inth

Include the pinned Inth CLI and delegate login, logout, status, organization
lookup, region discovery, and project provisioning to its native executable.
Reuse Inth's existing connection and credential storage, including token refresh.
Remove c15t's separate device authorization and token-storage implementation.

Use current Inth project commands and `consent.backendUrl`. Follow all project
and organization pages; reject pending backends and invalid pagination. Remove
legacy v2 region filtering and provisioning options. Save only the public
selected project ID in the application's `.c15t/project.json`. Older c15t
credential files remain untouched and are no longer read.

Keep the generation, frontend, runtime, and agent exports independent of Inth
for static native hosts. Replace the standalone raw-token authentication export
with the executable adapter; control-plane adapters now accept cwd, organization,
and cancellation instead of credentials or a custom API URL.
