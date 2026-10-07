---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
---

### Record consent saves replayed after the policy token expired

Failed saves are queued and replayed for up to 7 days, but the self-hosted
backend's policy tokens expire after 30 minutes, so late replays were refused
with `409 POLICY_SNAPSHOT_INVALID`. The backend records a late save when its
token was valid at the save's `givenAt`, the request arrives within
`policySnapshot.replayWindowSeconds` of expiry (default 7 days, `0` turns it
off), and the policy has not changed. These records get
`runtimePolicySource: 'snapshot_token_replayed'`.

Refusals are more specific. An expired choice or a replay past the window gets
`409 POLICY_SNAPSHOT_EXPIRED`. A token for a changed policy gets
`422 STALE_POLICY` with reason `policy-changed`. A token that does not verify
still gets `409 POLICY_SNAPSHOT_INVALID`.

`@c15t/core` transports throw `ConsentSaveRejectedError` for these refusals, and
the kernel drops the save instead of retrying. The choice stays in the browser.
Custom transports can throw it too, and `isConsentSaveRejection()` checks for
one. Both are exported from `@c15t/core` and `@c15t/core/transports`.

#### Migration

- Code that reads consent records and switches on `runtimePolicySource` should
  handle `snapshot_token_replayed`.
- Code that matched `409 POLICY_SNAPSHOT_INVALID` from `POST /subjects` should
  also expect `409 POLICY_SNAPSHOT_EXPIRED` and `422 STALE_POLICY` with reason
  `policy-changed`.
- To keep refusing every save that arrives after its token expired, set
  `policySnapshot.replayWindowSeconds: 0`.
