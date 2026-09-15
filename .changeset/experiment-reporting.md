---
"@c15t/core": minor
"@c15t/react": minor
"@c15t/nextjs": minor
"@c15t/vue": minor
"@c15t/svelte": minor
"@c15t/browser": minor
"@c15t/astro": minor
"c15t": minor
---

Send experiment impressions and choices to analytics without glue. `experiment.reportTo` accepts `'dataLayer'` (pushes `c15t_surface_shown` and `c15t_choice_recorded` onto `window.dataLayer` for GTM / gtag), `'posthog'` (calls `window.posthog.capture`), a function, or a list of any of these. Events carry the experiment id, arm, who assigned it, the surface, the decision (`consent_action`, `confirmed`, `time_to_decision_ms`) and the timestamp; no identifiers or user properties. Reporters are wired by every adapter (React, Next.js, Vue, Svelte, browser, Astro), a throwing reporter is logged and never blocks the consent flow, and `buildSurfaceShownReport` / `buildChoiceRecordedReport` / `resolveExperimentReporters` are exported for custom sinks. The `choice:recorded` kernel event and `onChoiceRecorded` payload now include `uiSource` and `consentAction`.
