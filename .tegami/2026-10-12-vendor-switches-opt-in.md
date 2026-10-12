---
packages:
  '@c15t/core': patch
  'c15t': patch
  '@c15t/react': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/browser': patch
  '@c15t/astro': patch
  '@c15t/cli': patch
---

### Show vendor switches only when you declare vendors

Vendor switches in the preference dialog are opt-in again. Since 3.0.0, every
`@c15t/integrations` helper showed its vendor with its own switch, so a site
that only registered `posthog()` got a PostHog switch under Analytics. The
dialog now shows only category switches until you declare a vendor in
`vendors` or on the backend. Once you do, helpers are listed by name next to
it, as before. A helper's vendor slug still gates loading either way.
