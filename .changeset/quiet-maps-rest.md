---
"@c15t/react": minor
"@c15t/nextjs": minor
"@c15t/translations": minor
---

Add consent-aware renderable integrations for Google Maps and YouTube embeds,
plus a shared SDK readiness hook. Google Maps now uses the official API types,
supports all direct-loader options, adopts an existing Maps singleton, retains
one manager-owned loader across component remounts, and renders a useful default
height and initialization fallback. Failed SDK registrations can be retried
without changing their singleton id. The renderable integrations also include
localized loading and error states, responsive YouTube defaults, and stricter
source configuration types.
