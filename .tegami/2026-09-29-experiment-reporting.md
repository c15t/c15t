---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
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

### Count each experiment arm's visitors through `/init`

While a visitor has no stored choice, `/init` sends their experiment arm in an
`x-c15t-experiment: <id>=<arm>` header and the backend adds
`experiment: { id, arm }` to the session report. A dashboard can compute an
opt-in rate per arm without any analytics setup.

On server-rendered pages, pass the experiment with the visitor's arm to
`resolveConsent({ experiment: { ...bannerShape, arm } })` in `c15t/next`,
`@c15t/tanstack-start` and `@c15t/svelte`. The returned state carries it to the
client. If you stream the state unawaited, pass the experiment to the provider
too. It warns in development when you forget. Astro and Nuxt send the arm on
their own.

Also added:

- `@c15t/schema` exports `CONSENT_EXPERIMENT_HEADER`, `formatExperimentHeader`
  and `parseExperimentHeader`.
- `choice:recorded` and `onChoiceRecorded` include `uiSource` and
  `consentAction`, and `onSurfaceShown` and `onChoiceRecorded` carry the arm.
- `notice:dismissed` carries `surface`, `timeToDecisionMs` and `experiment`, so
  opt-out experiments are measurable.
- DevTools show the assigned arm and each surface's first impression time on the
  Policy tab.
