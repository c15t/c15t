---
packages:
  '@c15t/core': minor
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/browser': minor
  '@c15t/astro': minor
  '@c15t/dev-tools': minor
  'c15t': minor
---

### A/B test banner presentation with any flag provider

Add an `experiment` option for A/B tests on banner and preferences presentation. Declare arms as `presentation` fragments under `variants`, then either pass the `variant` your feature-flag provider resolved (Vercel Flags, PostHog, LaunchDarkly, GrowthBook, Statsig) or let c15t pick one by `weights`. `defineExperiment()` infers the arm names, so a misspelled `variant` or `weights` key is a type error.

The assigned arm is merged over `presentation` and exposed as `snapshot.experiment` (React and Vue `useExperiment()`, Svelte `state.experiment`, browser `client.presentation`). It rides on `surface:shown` and `choice:recorded` and is saved with the choice as `metadata.experiment`, but only once the banner has shown it in the current page. A returning visitor who changes their choice from a footer link is not counted toward an arm they never saw.

Built-in assignment holds the banner until the arm is picked, so the visitor never sees the base banner swap for their arm; on a server-rendered page the banner appears after hydration. The arm is stored as `{ id, variant }` under `c15t-experiment-v1` once the banner has shown it. Nothing is stored for a visitor who is never prompted or for a host-resolved arm, and no identifier is stored.

Assignment and arm validation load as their own chunk, only when `experiment` is set, so a site without an experiment ships none of it. They are also exported from `c15t/experiment`, where `validateExperiment()` lets a test fail a build on a rejected arm.

Nothing in the experiment throws into the page. An undeclared `variant` or an unusable `weights` map logs an error and runs no experiment. An arm that trips a presentation diagnostic under the visitor's policy is not shown to that visitor, who sees the base presentation and is not counted, unless `acknowledgeDiagnostics: true`, which is recorded with the arm.

`@c15t/astro` resolves the arm on the server: per request through `consentMiddleware({ experimentVariant })` from `@c15t/astro/middleware` with `middleware: false`, or one fixed `variant`. Arms vary presentation and theme, not copy.

An arm can also carry `theme` overrides (`variants: { bold: { theme: { colors: { primary: '#0a0a0a' } } } }`), merged one token group deep over the host `theme`. Read the merged theme with React `useResolvedTheme()`, Vue `useResolvedTheme(theme)`, Svelte `getConsentManager().theme` and browser `client.theme`. In React, render its tokens with `<ConsentTheme theme={useResolvedTheme()} />`. An arm's `theme.consentActions` runs through the same prominence check as presentation.
