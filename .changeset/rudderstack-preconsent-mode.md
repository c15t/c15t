---
'@c15t/scripts': minor
---

Add an opt-in pre-consent mode to the RudderStack helper: `consentManagement.mapping` maps c15t categories to RudderStack consent IDs, loads the SDK inert (`preConsent` with storage strategy `none` and buffered delivery), and signals every consent decision through `rudderanalytics.consent()` — preserving pre-consent event attribution for consenting users. Blocking the load remains the default. The manifest engine gains a `rudderstack` consent signal type alongside `gtag`.
