---
packages:
  '@c15t/integrations': patch
---

### List Sentry in the preference dialog when the app runs the Sentry SDK

`sentry({ getClient })` declared the `sentry` vendor without a name or privacy
policy URL. Core logged a missing-declaration warning, and a site that shows
vendor switches could not list Sentry, so visitors could not turn it off inside
a granted category. The script now carries the same vendor details as
`sentry({ dsn })`.
