---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
---

### Errors say what the backend said

When a backend refuses a request with a JSON body, the error now carries its
message and code. Over HTTP/2 an error used to read
`c15t hosted transport: /init responded 402 ` with nothing after the status.
It now reads
`c15t hosted transport: /init responded 402: <message> (<CODE>)` and has
`status` and `code` properties. Bodies that are not JSON keep the old message.
This covers `/init`, `/manifest`, `/subjects`, the manifest cache, the static
manifest and the GVL. The dev warning for a failed init now includes the
message too.

A consent save refused with 402 (payment required) is no longer resent. The
choice stays in the browser, as it does for other permanent rejections. A 402
on init is not retried. A 409 or 422 save is also no longer resent when its
permanent code, such as `SUBJECT_CONFLICT`, is at the top level of the body
instead of under `cause`.

`@c15t/node-sdk` now reads a top-level `code` when the body has no
`cause.code`, so `serverCode` is set for `{ message, code }` bodies.
