---
'@c15t/react': patch
---

`fetchSSRData` sends the `x-c15t-version` header on its server-side `/init` request and forwards an incoming one, matching the browser transports, so the backend can attribute server-rendered traffic to a client release.
