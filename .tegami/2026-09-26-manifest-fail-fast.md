---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Server rendering no longer waits on a slow consent backend

`resolveConsent` in Next.js and TanStack Start, and Nuxt server rendering, wait
at most `timeoutMs` (500 ms by default) for the visitor's policy. If the budget
runs out, the page renders without consent UI, optional categories stay denied
and gated scripts stay blocked. The browser shows the banner once the backend
answers.

After a failed manifest request with nothing cached, the server cache waits 1
to 5 seconds before retrying and throws `ManifestUnavailableError` in between.
The upstream request timeout drops from 10 to 5 seconds. Next.js
`resolveConsent` reads the manifest through the in-process cache, so warm
renders make no request to your manifest route.

To migrate:

- If your backend takes over 500 ms on a cold cache, the banner appears after
  hydration on that request. Raise `timeoutMs`, or set `timeoutMs: false` to
  wait up to the 5 second request timeout.
- Pass `waitUntil` to Next.js `resolveConsent`, or `onBackgroundRevalidate` to
  TanStack Start `resolveConsent`, so serverless platforms keep the manifest
  request alive after the render stops waiting.
- Code that retries the manifest cache after a failure gets
  `ManifestUnavailableError` with `reason: 'backoff'`. `retryAfterMs` says when
  to try again.
- Next.js `resolveConsent` refuses to forward `forwardHeaders` credentials to a
  plain `http://` manifest URL on a non-loopback host. The render falls back to
  the baseline state and reports the error.
