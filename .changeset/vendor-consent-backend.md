---
'@c15t/backend': minor
---

Store vendor-level consent. `POST /subjects` accepts `vendorChoice`, the per-vendor grant map a v3 client sends when the publisher declares vendors, and stores it as sent on the consent row. A grant for a vendor the manifest does not declare is refused with `VENDOR_OUT_OF_SCOPE`; a denial is kept. Retrying the same act with a different map is a `CONFLICT`. `GET /subjects/:id` returns each row's map and the newest one as `subjectVendorChoice`. Migration `4-vendor-choice` adds the nullable `consent.vendorChoice` JSON column; run the migrator before deploying.
