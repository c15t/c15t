---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
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
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### A/B test banner presentation with any flag provider

Add an `experiment` option for A/B testing banner and preferences
presentation. Your `presentation` is the `control` arm and `arms` lists what
each other arm changes. Pass the `arm` your feature flag resolved, or a
`split` such as `{ control: 60, wall: 40 }` for c15t to pick.
`defineExperiment()` infers arm names, so a misspelled key is a type error.

```ts
experiment: {
  id: 'banner-shape',
  arms: { wall: { prompt: { variant: 'wall' } } },
  arm: flagValue, // or split: { control: 60, wall: 40 }
}
```

The active arm is exposed as `snapshot.experiment` (React and Vue
`useExperiment()`, Svelte `state.experiment`, browser `client.presentation`).
It is sent on `surface:shown` and `choice:recorded` and saved with the choice
as `metadata.experiment`, but only after the banner has shown it on the
current page.

When c15t picks the arm, it holds the banner until the arm is resolved, so on
a server-rendered page the banner appears after hydration. The arm is stored
as `{ id, arm }` under `c15t-experiment-v1`. No identifier is stored.

An undeclared `arm` or unusable `split` logs an error and runs no experiment.
An arm that trips a presentation diagnostic shows `control` instead, unless
you set `acknowledgeDiagnostics: true`. `validateExperiment()` from
`c15t/experiment` lets a test fail the build on a rejected arm.

In `@c15t/astro`, pass `experimentArm` to `consentMiddleware()` from
`@c15t/astro/middleware` (with `middleware: false`), or set one fixed `arm`.

Arms vary presentation and theme, not copy. Read the merged theme with React
`useResolvedTheme()`, Vue `useResolvedTheme(theme)`, Svelte
`getConsentManager().theme` or browser `client.theme`. In React, render it
with `<ConsentTheme theme={useResolvedTheme()} />`.
