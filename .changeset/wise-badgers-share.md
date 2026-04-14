---
"c15t": patch
"@c15t/backend": patch
"@c15t/schema": patch
---

Add token-first legal-document consent groundwork for `2.0`.

- `c15t`: expand the unstable policy-consent input types so legal-document writes can prefer `documentSnapshotToken`, fall back to `policyHash`, and keep `policyId` only as a compatibility path.
- `@c15t/backend`: update legal-document consent writes to resolve append-only consent against a verified document snapshot token when configured, or against a provided document hash when only lighter-weight release proof is available.
- `@c15t/schema`: extend the subject consent schema and error shapes for legal-document snapshot tokens and hash-based legal-document resolution.
