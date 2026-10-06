---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
---

### Turn off PostHog modules you do not use

`posthog()` from `@c15t/integrations/posthog` takes a `features` option with `surveys`, `heatmaps`, `deadClicks`, `webVitals` and `featureFlags` switches. Set one to `false` and PostHog skips that feature's module or its `/flags` requests. `surveys: false` is the only way to skip `surveys.js`, which PostHog downloads even when surveys are off in the project. Unset switches keep today's behavior, and `initOptions` still wins over a switch for the same key.
