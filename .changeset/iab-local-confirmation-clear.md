---
"@c15t/core": patch
"@c15t/iab": patch
---

Keep confirmed IAB authority when a save fails or the backend assigns a subject ID, and replay the original TC string and confirmation time. Cancel stale encoding and save responses after newer actions or identity changes. Remove addon authority and TC storage on explicit consent clearing, including when the addon is not mounted.
