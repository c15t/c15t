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

### Report experiment impressions, choices and notice dismissals

Send experiment impressions and choices to analytics without glue. `experiment.reportTo` accepts `'dataLayer'` (pushes `c15t_surface_shown`, `c15t_choice_recorded` and `c15t_notice_dismissed` onto `window.dataLayer` for GTM / gtag), `'posthog'` (calls `window.posthog.capture`), a function, or a list of any of these. Events carry the experiment id, arm, who assigned it, the surface, the decision (`consent_action`, `confirmed`, `time_to_decision_ms`) and the timestamp; no identifiers or user properties. Only visitors the banner showed the arm to are reported.

Reporting loads with the experiment chunk, so it costs nothing on a site without an experiment. When a server-rendered banner is on screen before the chunk arrives, its impression is reported once reporting attaches. A throwing reporter is logged and never blocks the consent flow or the other reporters. The `choice:recorded` kernel event and `onChoiceRecorded` payload now include `uiSource` and `consentAction`.

Each `'dataLayer'` push carries every property, `undefined` where the event has none, and sends `confirmed` as a comma-separated string, so GTM's merged data model never carries one event's values into the next. The `'posthog'` target holds up to 50 events for 30 seconds while `window.posthog` is not on the page yet and sends them in order once it appears; after that it drops them and stops polling. A `capture` that throws for one held event does not drop the rest.

Opt-out experiments are measurable too. A dismissed `notice` prompt reports `c15t_notice_dismissed` with the arm, the surface and `time_to_decision_ms`, so an opt-out arm has an outcome to count against its impression even though no choice is saved. The `notice:dismissed` kernel event now carries `surface`, `timeToDecisionMs` and `experiment`. The surface is the snapshot's `activeUI`, so a programmatic `dismissNotice()` with no prompt open reports `surface: 'none'` and no timing, the same as a programmatic `save()`.

`createExperimentReporting`, `createPosthogReporter`, the built-in reporters and the report builders are exported from `c15t/experiment` for custom sinks; the report event types are exported from `c15t`.

Dev-tools show the assigned experiment arm and the first impression time of each surface on the Policy tab.
