---
"c15t": patch
"@c15t/backend": patch
---

Clamp client consent `givenAt` timestamps more than five minutes ahead of the server clock to server time before deriving consent validity. Preserve the client's original claim as `metadata.clientGivenAt` and use that claim for consent identity so retries remain idempotent. Sync local consent state to the timestamp recorded by the server. Leave timestamps within the five-minute tolerance and past timestamps unchanged.
