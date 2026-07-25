---
"c15t": patch
"@c15t/backend": patch
---

Clamp future consent `givenAt` timestamps to server time. Client-supplied consent times more than 5 minutes ahead of the server clock are now recorded at server time, preventing skewed device clocks from distorting audit records and pushing derived validity windows out indefinitely. The client's original claim is kept on the record as `metadata.clientGivenAt`, while consent identity still derives from that claim so retries stay idempotent. Local consent state now uses the timestamp recorded by the server. Timestamps within tolerance and older timestamps remain unchanged.
