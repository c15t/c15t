---
'c15t': minor
'@c15t/iab': minor
'@c15t/react': minor
'@c15t/schema': minor
'@c15t/translations': minor
'@c15t/ui': patch
---

Support IAB TCF 2.4 and TCF Policies v5.0.b.

- `IABConsentDialog` moves Features out of the locked "Essential Functions" section into their own informational section after Special Purposes. The section shows the IAB standard text from the vendor list (`standardTexts.features`), falling back to the new `iab.preferenceCenter.features` translation in all 35 locales. Each feature lists its illustrations and the vendors that use it, with no switch, lock or per-vendor toggle. Special Purposes stay locked. `IABConsentDialog.PurposeItem` gains an `informational` mode for this.
- The GVL schema and types accept `standardTexts`, exported as `GVLStandardTexts`. The internal `useGVLData()` hook returns `featuresStandardText`.
- `__tcfapi` TCData now includes `vendor.disclosedVendors`, matching the TC string's disclosed vendors segment (CMP API v2.2).
- TC strings always set IsServiceSpecific=1. The `isServiceSpecific` option is deprecated; passing `false` logs one warning and has no effect.
- `@iabtechlabtcf/core` is now `^1.5.22`. Vendors that declare only Special Purposes no longer get their legitimate interest bit set, including when c15t saves consent restored from an older TC string.
- Decoding a TC string no longer drops vendor consents, legitimate interests or disclosures for vendor IDs above 1000.
- Special Feature 2 comments and fixtures use its new name, "Identify devices based on information actively requested".

Hosted and self-hosted setups need no migration beyond upgrading. `tcfPolicyVersion` stays 5, so existing TC strings stay valid and users are not asked to consent again.
