---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Keep consent changes flowing when a listener throws or updates consent

A snapshot subscriber or event listener that throws no longer stops later
listeners or persistence from seeing the change, and no longer rejects the
`commands.save()` that caused it. c15t reports the error with `reportError` in
the browser and `console.error` elsewhere, so it can't end a Bun or Deno server
process.

Every listener sees changes in commit order, with the snapshot each change
produced, even when a listener changes consent while being notified. Listeners
that keep changing consent in response to each other stop after 100 nested
notifications, and the error is reported.
