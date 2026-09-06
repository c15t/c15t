---
"@c15t/nextjs": patch
---

Forward `x-forwarded-for` and `user-agent` to the backend on server-side `/init` calls by default, matching what the 2.x server helper sent. A backend that geolocates from the client IP when no CDN geo header is present got no country on server-prefetched requests, and consent records lost the user agent. `forwardHeaders` still adds more.
