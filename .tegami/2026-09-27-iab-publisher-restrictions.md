---
packages:
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on
`createIAB`, `IABProvider`, the runtime's `iab` options or the Astro
integration's `iab` options. c15t encodes them in the TC string, decodes them
from stored strings, and reports them through `__tcfapi('getTCData')` as
`publisher.restrictions`. Before, they were not encoded and that map was always
empty.

Consent-gated scripts, network rules and iframes with a `vendorId` apply the
restrictions. The React, Vue, Svelte and `@c15t/browser/iab` preference centres
list each vendor under the legal basis the restrictions leave it, so a vendor
moved to legitimate interest gets an objection control instead of a consent
toggle. A refused c15t category no longer blocks an IAB target that uses only
legitimate interest after restrictions. Custom UIs can use
`applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass
`publisherRestrictions` to `processGVLForDialog`. Display-model rows report
`hasConsentBasis`.

Unsupported restrictions, such as reserved type 3 or vendors and purposes
missing from the vendor list, throw `PublisherRestrictionError` instead of being
dropped. `whenReady()`, `save()` and `generateTCString()` reject and no TC
string is written. A stored TC string whose restrictions differ from the
configuration is not restored. Returning visitors see the banner again, and IAB
gates stay denied until they save.
