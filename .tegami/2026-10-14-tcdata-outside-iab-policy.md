---
packages:
  "@c15t/core": patch
  "@c15t/iab": patch
---

### Return only base TC data when the policy does not use IAB TCF

When the visitor's resolved policy does not use IAB TCF, `__tcfapi`
`getTCData`, `getInAppTCData` and `addEventListener` now return only
`gdprApplies: false`, `tcfPolicyVersion`, `cmpId` and `cmpVersion`, beside
`cmpStatus`, `eventStatus` and `listenerId`. CMP API v2 allows no other
fields in that case, so no TC string, `addtlConsent`, purpose or vendor data
reaches vendors. The policy decides this, not the visitor's jurisdiction.

The new `TCDataOutsideTCF` type describes that response. `__tcfapi`
callbacks now receive `TCData | TCDataOutsideTCF`, and `TCData.gdprApplies`
is `true`, so check `gdprApplies` before reading `tcString`.
