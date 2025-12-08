---
"@c15t/dev-tools": major
"@c15t/backend": major
"@c15t/react": major
"c15t": major
"@c15t/cli": major
---

feat(core)!: removed deprecated options, values from store
feat(core)!: replaced deprecated tracking blocker with network blocker
feat(backend)!: removed deprecated v1 backend
feat(core)!: updated core store to use the new ConsentStoreState
feat(cli)!: updated self-host migrate command to use the new backend migrator entrypoint (no more /v2 path)
docs: added network blocker documentation for JavaScript, React, and Next.js
feat(backend): compress responses for a 14% reduction in payload size for geo-location requests
feat!: add support for Opt-Out jurisdiction models & removed jurasdiction messages & showConsentBanner boolean