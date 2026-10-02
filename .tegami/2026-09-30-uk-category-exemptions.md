---
packages:
  '@c15t/schema': minor
  '@c15t/core': minor
  '@c15t/backend': minor
  '@c15t/browser': patch
  '@c15t/cli': patch
  '@c15t/nextjs': patch
  '@c15t/react': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/translations': minor
  '@c15t/integrations': patch
  '@c15t/dev-tools': patch
---

### Combine reviewed UK exemptions with consent

Add explicit GB-only category exemptions for statistics and appearance or
functionality processing. Exempt categories can run before consent and expose
persistent objection controls while other categories still require consent.
Store exemption preferences separately from consent receipts, retain objections
across reloads, and require consent when an exemption is removed. Accept All
preserves exemption objections; Reject All objects to exempt processing too.

Add stock preference labels, React exemption-state access, version 2 policy
negotiation, separate backend preference evidence and audit declarations. Keep
exemption permissions separate from vendor consent signals. Ordinary policies
retain their existing contract and fingerprints. Eligibility remains an explicit
operator declaration, with guidance for reviewing premade integrations.
