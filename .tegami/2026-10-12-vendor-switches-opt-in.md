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
