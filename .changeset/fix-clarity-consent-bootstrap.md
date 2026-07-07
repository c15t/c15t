---
'@c15t/scripts': minor
---

Fix Microsoft Clarity integration: the pre-load stub no longer sets the `v` version marker — Clarity's runtime treats a pre-set `v` as a duplicate install ("Error CL001: Multiple Clarity tags detected") and never starts, so installs collected no data. Consent synchronization now uses Clarity Consent V2 (`consentv2` with `ad_Storage`/`analytics_Storage`), mapping c15t `marketing` to `ad_Storage` and `measurement` to `analytics_Storage`. The `defaultConsent` option now accepts a Consent V2 payload; boolean values are still supported and expand to both storage channels.
