---
'@c15t/backend': patch
'@c15t/schema': patch
---

`POST /subjects` clamps a client-supplied `givenAt` more than five minutes in the future to server time before recording it, so a device with a wrong clock cannot write a consent dated in the future. The original claim is kept on the record as `metadata.clientGivenAt`, and the consent id still derives from the claim, so a retry of the same skewed submission is a replay rather than a second consent. Past timestamps and small skews are stored as sent.
