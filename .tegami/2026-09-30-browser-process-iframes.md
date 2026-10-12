---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Check iframes on demand with `processIframes()`

`iframeBlocker: { disableAutomaticBlocking: true }` works outside React. The
`@c15t/core/runtime` consent runtime has a `processIframes()` method, exposed in
`@c15t/browser` as `client.processIframes()` and `c15t.processIframes()`. Each
call pauses gated frames that consent does not allow and restores the ones it
does. `c15t.push(['processIframes'])` runs once the policy has resolved.
