---
'@c15t/schema': major
---

Replace `PolicyConfig`, `ResolvedPolicy`, `policyPackPresets` and the `none` model with `PolicyRule`, `ResolvedPolicyRule` and `policyRulePresets`. Rules separate permission model from prompt, declare category scope, required actions, persistent rights, choice and notice validity, GPC mapping and copy revision. Presentation is configured independently and excluded from behavioral fingerprints.

Use required contract-version-1 `policyResolution` on init responses and schema-version-2 manifests whose `policyPacks` entries contain only `match`, `rule` and `fingerprints`. Configure producers with `policyRules`; legacy configuration and wire conversion helpers are removed. Resolve author input with `resolvePolicyRules`, validate it with `inspectPolicyRules`, and construct manifest entries with `createConsentManifestPolicyPack(rule)`.

Keep distinct policy, choice and notice fingerprint domains. Frozen legacy material inputs retain the exact v2 hash bytes for lifetime receipt comparison; compatibility metadata is validated and cannot authorize changed current behavior. Legacy storage decoding remains read-only.

Presets include dated source reviews and explicit product assumptions. They do not determine a deployment's legal basis or establish compliance. Coordinate producer/client deployment and invalidate cached old clients before relying on new GPC semantics.
