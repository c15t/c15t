---
packages:
  '@c15t/schema': minor
  '@c15t/backend': minor
  '@c15t/tanstack-start': minor
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

### Count each experiment arm's visitors through `/init`

The backend now learns which arm a visitor runs before they choose, so a dashboard can compute an opt-in rate per arm without any analytics setup. While a visitor has no stored choice, `/init` carries their arm in an `x-c15t-experiment: <id>=<arm>` header, and the backend adds `experiment: { id, arm }` to that request's session report. Manifest-mode renders and init routes put it on the report they send to `POST /sessions`. A visitor who already chose is not counted, because they are not shown the banner.

On a server-rendered page, pass the arm to `resolveConsent({ experiment: { id, arm } })` in `c15t/next`, `@c15t/tanstack-start` and `@c15t/svelte`; Astro and Nuxt send the arm they rendered on their own. `@c15t/schema` exports `CONSENT_EXPERIMENT_HEADER`, `formatExperimentHeader` and `parseExperimentHeader`, and the session report schema gains an optional `experiment`.

The `choice:recorded` kernel event and `onChoiceRecorded` payload now include `uiSource` and `consentAction`, and `onSurfaceShown` and `onChoiceRecorded` carry the arm, so forwarding experiment events to GTM, PostHog or any other tool is one callback.

Opt-out experiments are measurable too. The `notice:dismissed` kernel event now carries `surface`, `timeToDecisionMs` and `experiment`. The surface is the snapshot's `activeUI`, so a programmatic `dismissNotice()` with no prompt open reports `surface: 'none'` and no timing, the same as a programmatic `save()`.

Dev-tools show the assigned experiment arm and the first impression time of each surface on the Policy tab.
