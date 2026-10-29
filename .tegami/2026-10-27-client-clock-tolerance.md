---
packages:
  "@c15t/backend": patch
---

### Accept consent saves from clocks a little ahead of the server

`POST /subjects` refused a save with 400 `INPUT_VALIDATION_FAILED` when
`givenAt`, a category receipt's `confirmedAt` or `vendorChoice.confirmedAt` was
later than the backend's clock by any amount. A visitor whose clock ran a few
hundred milliseconds ahead lost the live save, and the backend held no record
unless the visitor loaded another page. The backend now accepts these times up
to ten minutes ahead, the same tolerance it allows a replayed save, and records
them as sent. A time further ahead is still refused.
