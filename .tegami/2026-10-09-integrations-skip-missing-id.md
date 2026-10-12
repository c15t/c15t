---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
---

### Log and skip a helper with a missing vendor ID instead of throwing

Helpers that need an account ID, such as `posthog()`, `googleTagManager()` and
`metaPixel()`, threw when the ID was empty or only whitespace. IDs usually come
from environment variables, so a blank `VITE_POSTHOG_KEY=` threw while the app
rendered and took the consent banner down with it.

These helpers now log an error such as
`posthog: missing or invalid id. The script will not load.` with
`console.error` and return a script that never loads. The rest of the page,
including the consent UI, keeps working, and the vendor stays listed in the
preference center. An ID in the wrong format, such as a
malformed Mixpanel token, LogRocket app ID or Klaviyo public key, is handled the
same way, with the existing message.

Other configuration mistakes, such as a non-https `scriptUrl` override or an
invalid RudderStack consent mapping, still throw. `@c15t/scripts` re-exports
these helpers and behaves the same way.
