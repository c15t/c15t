---
packages:
  '@c15t/core': patch
---

### Preserve visitor identity for necessary-only choices

Keep the visitor's subject ID when a necessary-only consent banner is acknowledged and the page reloads. Store the identity with the notice acknowledgement without creating optional consent, and discard it when the records are cleared. Canonical subject updates from a server or sibling subdomain survive reloads, while a dropped cookie write retains the newer local identity or identity removal until the cookies change. Category-based cleanup also protects notice identity records from wildcard deletion.
