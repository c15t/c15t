---
"@c15t/browser": patch
"@c15t/iab": patch
---

Stop browser startup when a synchronous ready listener disposes the client. Require an explicit backend URL for inline manifests and manifest URLs outside the backend's `/manifest` endpoint, preventing consent saves from targeting a CDN or being omitted. Preserve explicit IAB category refusals outside the current policy scope so saved consent records agree with the confirmed TC string.
