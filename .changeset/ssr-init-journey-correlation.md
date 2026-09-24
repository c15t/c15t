---
"@c15t/react": minor
"@c15t/nextjs": minor
---

Add an explicit `visitTracking: true` option to server init helpers. It correlates the existing init request with later consent saves using request-scoped query parameters, without additional telemetry requests, custom tracking headers, or persistent identifiers. Tracked SSR requests bypass shared caches, exclude known speculative prefetches, and require the backend to echo the exact ID before hydration can attribute saves. Server initialisations are reported separately from browser initialisations; neither proves that a person loaded the page.
