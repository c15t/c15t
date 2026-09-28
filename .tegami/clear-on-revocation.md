---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(@c15t/browser)
  c15t:
    replay:
      - exit-prerelease(c15t)
---

### Clear declared storage after consent revocation

Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.
