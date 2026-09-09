---
"c15t": patch
---

Handle blocked localStorage getters during hosted client startup without throwing. Preserve saved rejections across hosted initialization outages and recovery, including choices saved during fallback. Keep temporary fallback permissions separate from the saved hosted policy, and require fresh consent for invalid grants without forgetting prior denials.
