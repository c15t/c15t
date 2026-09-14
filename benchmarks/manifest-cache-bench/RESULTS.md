# manifest-cache-bench results

Captured 2026-09-14 on an Apple M5 Pro laptop, Node 24.19, against commit
`cc7dd2051` plus the stale-while-revalidate change to
`packages/core/src/libs/manifest-cache-runtime.ts`. Simulated Vercel CDN:
25 ms edge round trip, 150 ms origin round trip, origin sends
`Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.

"Before" is the committed runtime rebuilt without the change; "after" is
the same harness against the changed runtime. Only `@c15t/core`'s `dist`
differed between the two runs. In the "before" table the warmed scenarios'
CDN counter columns still include the warm-up request; the harness now
resets those counters after warming, so the "after" columns exclude it.

## Before

| Scenario | Requests | Resolved | Rejected | Min (ms) | p50 (ms) | p95 (ms) | Max (ms) | Stalls >10ms | App→CDN calls | CDN→origin | CDN fresh hits | CDN 304s | CDN stale serves | Manifest OK | Duration (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-instance-burst | 200 | 200 | 0 | 198.45 | 198.52 | 198.59 | 198.70 | 200 | 1 | 1 | 0 | 0 | 0 | yes | 198.82 |
| steady-state-expiry | 18000 | 18000 | 0 | 0.01 | 0.02 | 0.05 | 181.74 | 200 | 10 | 7 | 3 | 3 | 6 | yes | 37298.45 |
| edge-serving-stale | 50 | 50 | 0 | 25.42 | 26.44 | 26.60 | 26.73 | 50 | 50 | 1 | 0 | 0 | 50 | yes | 1395.37 |
| origin-down-warm | 20 | 20 | 0 | 26.40 | 26.40 | 26.41 | 26.41 | 20 | 1 | 1 | 0 | 1 | 1 | yes | 26.48 |
| edge-unreachable-warm | 5 | 0 | 5 | 10000.55 | 10001.29 | 10002.09 | 10002.09 | 5 | 5 | 1 | 0 | 0 | 0 | no | 50006.26 |
| edge-unreachable-cold | 3 | 0 | 3 | 10000.14 | 10000.58 | 10001.24 | 10001.24 | 3 | 3 | 0 | 0 | 0 | 0 | no | 30001.99 |

## After

| Scenario | Requests | Resolved | Rejected | Min (ms) | p50 (ms) | p95 (ms) | Max (ms) | Stalls >10ms | App→CDN calls | CDN→origin | CDN fresh hits | CDN 304s | CDN stale serves | Manifest OK | Duration (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-instance-burst | 200 | 200 | 0 | 194.69 | 194.73 | 194.77 | 194.85 | 200 | 1 | 1 | 0 | 0 | 0 | yes | 194.92 |
| steady-state-expiry | 18000 | 18000 | 0 | 0.01 | 0.02 | 0.05 | 181.07 | 20 | 5 | 3 | 2 | 4 | 2 | yes | 37087.14 |
| edge-serving-stale | 50 | 50 | 0 | 0.00 | 0.00 | 0.08 | 26.87 | 2 | 4 | 4 | 0 | 2 | 4 | yes | 135.27 |
| origin-down-warm | 20 | 20 | 0 | 0.07 | 0.07 | 0.09 | 0.09 | 0 | 1 | 1 | 0 | 1 | 1 | yes | 41.53 |
| edge-unreachable-warm | 5 | 5 | 0 | 0.00 | 0.00 | 0.09 | 0.09 | 0 | 1 | 0 | 0 | 0 | 0 | yes | 0.10 |
| edge-unreachable-cold | 3 | 0 | 3 | 9999.93 | 10001.03 | 10001.88 | 10001.88 | 3 | 3 | 0 | 0 | 0 | 0 | no | 30002.89 |
| bare-cache-control-through-cdn | 1200 | 1200 | 0 | 0.01 | 26.36 | 26.76 | 179.54 | 1120 | 56 | 1 | 55 | 1 | 0 | yes | 4089.86 |

## Reading the tables

- `cold-instance-burst` is unchanged by design: an empty cache has nothing
  to serve, so the first request pays one edge round trip and the other 199
  share it.
- `steady-state-expiry`: before, every `s-maxage` crossing stalled the
  whole 20-request batch on the revalidation round trip (200 stalled
  requests: the cold fill plus crossings at simulated seconds 301 and 601,
  with each crossing costing more than one batch because the CDN's own
  copy had also gone stale). After, only the cold fill stalls; the
  revalidations run behind a served stale entry. Fewer app-to-CDN calls
  too, because the floor stops repeat revalidations.
- `edge-serving-stale`: before, a CDN copy with `Age` past `s-maxage`
  was never stored, so every request paid the edge round trip (50 calls
  for 50 requests). After, it is stored as already stale and served, with
  one background revalidation per phase.
- `origin-down-warm` and `edge-unreachable-warm`: before, an expired
  entry blocked on the network, which with the edge unreachable meant five
  10 second rejections and no manifest. After, the stale entry is served
  from memory in under a millisecond and one background attempt fails
  quietly.
- Eviction under key minting was checked separately: with 128 slots and a
  visitor minting a fresh `?language=` key on every request, a manifest read
  at least once per 128 junk requests stays cached and refetches once in
  400 simulated seconds; one read less often than that is evicted and
  refetched each time, which is the same LRU outcome as before this change.
  Revalidation floors live in a per-cache map capped at 256 records (twice
  the default cache cap) with oldest-first eviction, and a fresh store clears
  its key's record, so the map cannot grow with minted keys. Re-measured
  after that change: heap stayed flat across 115,000 minted keys.
- `edge-unreachable-cold` is unchanged: a cold instance that cannot reach
  the edge still waits out the cache's 10 second timeout and rejects. A
  shorter render-blocking timeout is the remaining lever there.
- `bare-cache-control-through-cdn` (after only) models an origin that sends
  `Cache-Control` without `CDN-Cache-Control`. Vercel consumes `s-maxage`
  and `stale-while-revalidate` and forwards `public, max-age=0,
  must-revalidate`, so the app sees no shared-cache TTL and no stale window.
  The first fill gets the 5 s dedupe floor; from simulated second 6 the
  CDN copy's `Age` exhausts that floor on arrival, nothing is stored, and
  every batch waits on an edge round trip: 1120 of 1200 requests. This is
  why the backend now sends the policy as both
  headers; with `CDN-Cache-Control` present (the default in the other
  scenarios) the CDN forwards `Cache-Control` intact.
