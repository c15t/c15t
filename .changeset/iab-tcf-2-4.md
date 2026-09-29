---
'c15t': minor
'@c15t/iab': minor
'@c15t/react': minor
'@c15t/schema': minor
'@c15t/translations': minor
'@c15t/ui': patch
---

Support IAB TCF 2.4 and TCF Policies v5.0.b.

- `IABConsentDialog` shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- Decoding a TC string keeps vendor IDs above 1000.

No migration needed. Existing TC strings stay valid.
