---
"@c15t/backend": minor
"@c15t/schema": minor
"@c15t/dev-tools": patch
"c15t": minor
---

feat(policy): add policy packs for declarative regional consent resolution

Policy packs let you define regional consent rules once — c15t resolves the right policy automatically based on visitor location. Resolution follows fixed priority: region → country → fallback → default.

- Built-in presets: `europeOptIn()`, `europeIab()`, `californiaOptOut()`, `californiaOptIn()`, `quebecOptIn()`, `worldNoBanner()`
- Per-policy GPC support via `consent.gpc` field
- Fallback policies (`match.fallback`) as a safety net when geo-location headers are missing
- Material policy fingerprints for automatic re-prompting when consent semantics change
- Policy validation with `inspectPolicies()` for catching misconfigurations before deployment
- Snapshot tokens (signed JWT) for write-time consistency between `/init` and consent writes
- Dev-tools match trace panel showing full resolution path
