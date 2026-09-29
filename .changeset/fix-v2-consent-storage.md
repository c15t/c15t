---
"c15t": patch
"@c15t/iab": patch
---

Handle blocked localStorage getters during hosted client startup without throwing. Preserve saved rejections across hosted initialization outages and recovery, including choices saved during fallback. Keep temporary fallback permissions separate from the saved hosted policy, and require fresh consent for invalid grants without forgetting prior denials. Grants saved during an outage are not sent to the backend until confirmed, and IAB mode no longer restores a stored TC string while re-consent is pending.
