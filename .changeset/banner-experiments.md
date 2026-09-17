---
"@c15t/core": minor
"@c15t/react": minor
"@c15t/nextjs": minor
"@c15t/vue": minor
"@c15t/svelte": minor
"@c15t/browser": minor
"@c15t/astro": minor
"@c15t/dev-tools": minor
"c15t": minor
---

Add an `experiment` option for A/B tests on banner and preferences presentation. Declare arms as `presentation` fragments under `variants`, pass the `variant` your feature-flag provider resolved (Vercel Flags, PostHog, LaunchDarkly, GrowthBook, Statsig) or let c15t assign one deterministically with `weights`; built-in assignment is sticky per browser under the `c15t-experiment-v1` storage key. `@c15t/astro` requires `variant`: its banner is server-rendered, so an arm assigned in the browser would not match what the visitor saw. The assigned arm is merged over `presentation`, exposed as `snapshot.experiment` (React `useExperiment()`, Vue `useExperiment()`, Svelte `state.experiment`, browser `client.presentation`), attached to `surface:shown` and `choice:recorded`, and saved with every choice as `metadata.experiment` alongside `timeToDecisionMs` and `uiSource`. An arm that trips a presentation diagnostic is rejected at provider construction unless `acknowledgeDiagnostics: true`, which is recorded with the arm. Arms vary presentation only, not copy.

An arm can also carry `theme` overrides (`variants: { bold: { theme: { colors: { primary: '#0a0a0a' } } } }`), merged one token group deep over the host `theme`. Adapters render the merged theme; read it with React `useResolvedTheme()`, Vue `useResolvedTheme(theme)`, Svelte `getConsentManager().theme` and browser `client.theme`. `theme.consentActions` set by an arm runs through the same prominence check as presentation, so `@c15t/core` now exports `applyExperimentTheme`, `resolveExperimentTheme` and `actionAppearanceFromTheme` alongside the `ExperimentArm` and `ExperimentArmTheme` types.
