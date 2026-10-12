---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Index experiment attribution and summarise choices per arm

Migration `6-experiment-attribution` adds `experimentId`, `experimentArm` and
`timeToDecisionMs` columns to `consent`. `POST /subjects` fills them from
`metadata.experiment` and `metadata.timeToDecisionMs`, and drops malformed
values instead of failing the save.

`GET /experiments/:id/summary` (API key) returns choices per arm, split by
action and surface, with the median time to decision, filtered by `from`,
`to` and `domain`. `@c15t/node-sdk` exposes it as
`client.experiments.summary(id, { from, to, domain })`. For an opt-in rate,
divide by the visitors per arm from session reports.
