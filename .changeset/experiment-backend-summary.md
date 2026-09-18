---
"@c15t/backend": minor
"@c15t/schema": minor
"@c15t/node-sdk": minor
"c15t": minor
---

Summarise banner experiments from the backend. Migration `4-experiment-attribution` adds `experimentId`, `experimentVariant` and `timeToDecisionMs` columns to `consent`, indexed on `(experimentId, experimentVariant)`, and `POST /subjects` fills them from `metadata.experiment` and `metadata.timeToDecisionMs` while leaving `metadata` untouched. Values over 128 characters or malformed are dropped rather than failing the save. `GET /experiments/:id/summary` (API key) returns choices per arm split by `consentAction` and `uiSource` with the median time to decision, filtered by `from`, `to` and `domain`; the response is validated against the new `experimentSummaryOutputSchema` in `@c15t/schema`, and `@c15t/node-sdk` exposes it as `client.experiments.summary(id, { from, to, domain })`. The summary counts choices only; impressions never reach the backend, so rates are still computed from `experiment.reportTo` events.
