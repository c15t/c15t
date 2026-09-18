---
packages:
  "@c15t/backend": minor
---

### Store vendor-level consent

Store vendor-level consent. `POST /subjects` accepts `vendorChoice`, the per-vendor grant map a v3 client sends when the publisher declares vendors, and stores it as sent on the consent row, including vendors the client declares in code. Retrying the same act with a different map is a `CONFLICT`. `GET /subjects/:id` returns each row's map and the most recent act's as `subjectVendorChoice`. Migration `4-vendor-choice` adds the nullable `consent.vendorChoice` JSON column; run the migrator before deploying.
