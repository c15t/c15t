---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
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
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Vendor switches show only when you declare vendors

The preference dialog shows only category switches until you declare a
vendor. Your visitors make one choice for each category. You do not get
vendor switches that you did not ask for.

Since 3.0.0, the dialog showed a switch for the vendor of each
`@c15t/integrations` helper. For example, a site that added only `posthog()`
got a PostHog switch under Analytics. We did not intend this default.

To show vendor switches, declare at least one vendor in the `vendors` option
or on the backend. The dialog then also lists the vendors of your helpers by
name, as before. This change affects only the dialog. It does not change when
a script loads.
