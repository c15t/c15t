---
"@c15t/backend": patch
"@c15t/schema": patch
---

Clamp future consent `givenAt` timestamps to server time. Client-supplied consent times more than 5 minutes ahead of the server clock are now recorded at server time, preventing skewed device clocks from distorting audit records and pushing derived validity windows out indefinitely. The client's original claim is kept on the record as `metadata.clientGivenAt`, and consent identity still derives from that claim so retries of a clamped submission stay idempotent, including replays of records created before deterministic consent IDs. Timestamps within tolerance and older timestamps (offline fallback replay) are unchanged. `givenAt` is also now validated as an integer within the range `Date` can represent, so a nonsense timestamp returns a 400 instead of becoming an invalid date on the consent record.
