# RFC 0001: Consent Manifest

Status: **Accepted — recompute-on-write audit validation is owner-approved.**

## 1. Problem

Every c15t page load today performs a per-user request to the consent backend
(`GET /init`) before the consent UI can resolve. This puts a third-party,
often cross-region round trip on the critical rendering path (or on the host's
SSR TTFB). Yet almost everything `/init` returns is **per-tenant static data**;
only geo, language, and GPC are per-request — and all three are already present
in the request headers at the host's server/edge.

## 2. Design

Split `/init` into:

1. **The manifest** — `GET /manifest`: a geo-independent, CDN-cacheable,
   per-tenant document containing *everything needed to compute an `/init`
   response locally*.
2. **Local resolution** — a pure, synchronous function (the *shared resolver*)
   that both the backend `/init` route and host middleware/server routes call:

```
resolveInitFromManifest(manifest, { country, region, language, gpc }) → InitOutput
```

### 2.1 Parity by construction

There is exactly **one** resolver implementation. The pure core of the
backend's `resolveInitPayload` (`packages/backend/src/handlers/init/`) is
extracted into `@c15t/schema` and the backend `/init` route is refactored to
call it. Host-side manifest resolution calls the same function. The contract
test (§6) is regression insurance, not the parity mechanism.

### 2.2 Manifest contents (geo-independent by definition)

- **All policy packs**, each with a **precomputed fingerprint** (fingerprinting
  is async server-side; precomputing keeps local resolution sync and makes the
  backend the single fingerprint authority — version-skewed client hashing
  would mass-invalidate stored consent).
- **Matching rules** (country/region → jurisdiction → pack). Geo never affects
  manifest content or cache keys; it is a resolver input only.
- **Translation inputs** — the same inputs the backend resolver consumes
  (configured `i18n.messages`, legacy `customTranslations`, policy-level
  `i18n`, fallback/profile rules), *not* pre-flattened output. Optional
  `?language=` variant serves a single-language slice with identical cache
  semantics.
- **Branding**, `cmpId`, defaults.
- **GVL by reference** (version + URL), never inline. Fetched lazily only when
  the resolved jurisdiction is IAB. The parity invariant applies to the
  **assembled** payload (manifest + geo + language + gpc + fetched GVL).

### 2.3 Cache semantics

`Cache-Control: public, s-maxage=<N>, stale-while-revalidate=<M>` + `ETag`,
versioned by config revision. Per-tenant, never per-user. Staleness window
(≤ s-maxage after a dashboard policy edit) is documented and tenant-tunable.

## 3. Transport selection — explicit, non-breaking

- Default: direct backend `GET /init` (today's behavior, unchanged — the
  non-breaking guarantee; also the fallback for static/no-server hosts).
- Installing the Next/Nuxt server piece configures the client to a same-origin
  endpoint. **No runtime probing** (a 404 probe costs the RTT we save).
- Tiers: SSR (headers at server) → edge (headers at edge fn) → static
  (build-time manifest inline + client geo microfetch) → offline (no geo).
  While geo is unresolved, render the **strictest applicable policy**;
  degrading toward stricter compliance is safe, the reverse is not.
- Unknown-surface rule: a policy resolving to a surface this library version
  doesn't know falls back `requested → configured default → strictest known` —
  never render nothing.

## 4. Resolver inputs

`country`, `region` (CDN geo headers), `language` (`Accept-Language`),
`gpc` (`Sec-GPC`). GPC affects resolution output (opt-out defaults), never
manifest cache keys.

## 5. Audit strategy (Accepted — recompute-on-write)

Hosted `/init` signs a `policySnapshotToken` over the full resolved decision.
Manifest mode has no backend read, hence no token. The accepted strategy is
**recompute on write**: `POST /subjects` in manifest mode carries the asserted
decision inputs (`policyId`, `fingerprint`, `country`, `region`, `language`,
`gpc`). The backend constructs the same manifest body as `GET /manifest`,
re-runs the shared resolver with those inputs, and accepts only when the
derived `policyId` and `fingerprint` match the asserted values. Trust moves to
the write path, where the server is authoritative anyway and off the
perf-critical path.

Enforcement matrix:

| Write evidence | Backend behavior |
| --- | --- |
| `policySnapshotToken` | Verify the token and use the token-backed audit path. Asserted manifest decision inputs are not required. |
| No token + complete asserted decision inputs | Recompute from the current manifest and accept only if `policyId` and `fingerprint` match. Audit records use the same runtime decision fields as token-backed writes, with source `manifest_recompute`. |
| Neither token nor asserted decision inputs | Legacy behavior is unchanged: accept or reject exactly as the existing write-time fallback configuration dictates. |

If recompute validation fails, `POST /subjects` returns HTTP `409` with
`code: "STALE_POLICY"` and message
`"Policy decision is stale; refresh the consent manifest and retry"`. Clients
should refresh `GET /manifest`, resolve again, and retry the save. Incomplete
manifest decision inputs are rejected with HTTP `422` and the same
`STALE_POLICY` code.

Alternatives considered: per-pack pre-signed tokens (too coarse — tokens are
per-decision), short-TTL manifest signature + server expansion.

## 6. Contract test (release gate for any manifest arm)

Fixture matrix — jurisdictions × languages × GPC on/off × policy packs
(incl. IAB) — asserting `assemble(manifest, inputs) ≡ backend GET /init`
byte-for-byte. Lives with the shared resolver in `@c15t/schema`; run in CI on
every change to resolver, manifest route, or `/init`.

## 7. Rollout

Additive only: new `/manifest` route; `/init` internally refactored onto the
shared resolver with behavior frozen (existing backend tests + shadow-compare
old-vs-new resolver over the fixture matrix before switchover); kernel gains
`createManifestTransport`; Next/Nuxt server pieces are opt-in installs.
