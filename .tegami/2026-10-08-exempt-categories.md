---
packages:
  '@c15t/schema': minor
  '@c15t/core': minor
  '@c15t/integrations': patch
---

### Exempt categories inside an opt-in rule

An `opt-in` policy rule can list `exemptCategories`: categories that run before
the visitor chooses, because a consent exemption covers them, while every other
category still waits for consent. An exempt category is always part of the
choice and shows as on, and Reject All or switching it off records an ordinary
refusal. `marketing` cannot be exempt. Vendor consent APIs such as Google
Consent Mode and Microsoft Clarity receive exempt categories as denied, even
after Accept All, through the new `consentSignals` field on script callbacks.

`policyRulePresets.ukOptInWithStatistics()` applies this to the UK statistics
exception in PECR Schedule A1: GB only, `measurement` exempt, everything else
opt-in. Rules without exemptions keep their wire shape and fingerprints.
