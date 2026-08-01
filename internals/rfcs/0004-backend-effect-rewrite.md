# RFC 0004: Backend Rewrite — Effect SQL and a Measured Parallel Package

Status: **Draft — MongoDB removal confirmed; Effect v4 is the working
assumption. Remaining decisions in §10.**

## Problem

`packages/backend` is ~9.8k LOC of source (handlers 3.1k, db 1.6k, utils 1k,
middleware 0.9k, cache 0.8k) against 39 test files and a 55% line-coverage
floor. Four things are wrong with it, and three of them trace back to one
cause.

### The join-less data layer

fumadb targets a lowest common denominator that includes MongoDB, so the
query surface has no joins. Counting every ORM call in `src`: `create` ×43,
`findFirst` ×31, `findMany` ×22, `count` ×11, `updateMany` ×8, `transaction`
×6, `upsert` ×4, `deleteMany` ×4, `createMany` ×2. **Zero joins.** The cost is
visible in the code:

- `src/handlers/utils/consent-enrichment.ts:90` — a `for` loop awaiting
  `findLatestPolicyByType` once per policy type, sequentially, not even
  `Promise.all`. The function's own docstring claims it "uses batch queries".
- `src/handlers/subject/list.handler.ts:49,66` — fetch subjects, then
  hand-roll a chunked loop over subject IDs to fetch consents, because
  subject→consent cannot be joined. One lateral join in Postgres.
- Same file — `count: subjectItems.length`. The pagination total is the page
  length, not a `COUNT`.
- `src/db/registry/utils.ts` — `generateUniqueId` does read-then-create with
  10 retries and exponential backoff, because there is no dependable
  upsert-with-conflict-target.
- `vitest.config.ts` has to inline fumadb and alias `semver/functions/compare`
  to a `.js` path, because fumadb ships extensionless imports.

### A migrator that migrates two of five documented adapters

`docs/self-host/guides/database-setup.mdx` documents kysely, drizzle, prisma,
typeorm and mongo. But `src/db/migrator/index.ts:59-79` branches on whether
the adapter has `createMigrationEngine` — only kysely and mongo do. Drizzle,
Prisma and TypeORM users fall through to `generateSchema()`, which returns
`{ code, path }`: schema code printed at them to paste into their own project
and migrate themselves. **Three of five documented adapters have never had a
real migrator.**

### Multi-version schema machinery nothing uses

There is exactly one `orm()` call site in the backend:

```ts
// src/init.ts:68
const rawOrm = client.orm('2.0.0');
```

Hardcoded to latest. The `v1` schema exists in the `DB` schemas array purely
to give the migrator an upgrade path; it is never served. That is also why
there are two fumadb instances (`DB` with `[v1, v2]`, `LatestDB` with `[v2]`).
The CLI only ever asks for latest too — `migrator({ db, schema: 'latest' })`
at `packages/cli/src/commands/self-host/migrate/index.ts:35`. fumadb's version
registry solves a problem c15t opted out of having.

### Observability that cannot answer questions

`@c15t/logger` is a 656-LOC level-based logger. 22 source files call it,
mostly `logger.debug` scattered through request paths. There is no per-request
wide event, no sampling, no drain, and no redaction — on a product that
processes IP addresses and sells GDPR compliance. OTel spans exist
(`withDatabaseSpan`) but are not correlated with logs.

## Non-goals

- **No schema changes.** The 2.0.0 schema is the contract. Freezing it is what
  makes this a provably behaviour-preserving rewrite rather than an
  open-ended one. Schema work comes after cutover.
- **No changes to browser packages.** Effect does not enter `core`, `ui`,
  `react`, or any package subject to the bundle-size budget.
- **No new endpoints or response-shape changes.** Wire compatibility with
  `@c15t/backend` 2.x is a hard requirement throughout.

## 1. Strategy: a parallel package

The rewrite lands as a new workspace package built alongside the existing one,
not as an in-place refactor.

- **`"private": true`, never published during the parallel phase.** The
  working name does not leak to consumers, and at cutover it is renamed to
  `@c15t/backend` rather than stranding a `-next` package on npm. This is
  strictly better than picking a permanent parallel name.
- Scaffold per the `creating-a-package` skill. It joins the linked changeset
  group only at cutover, when it takes the `@c15t/backend` name.
- The old package stays untouched and shipping until the new one wins on
  parity *and* on measurements.

Parallel is what makes §7 possible: two implementations of the same contract,
runnable in the same process, benchmarked head-to-head on identical fixtures.
An in-place refactor can only be compared against git history, which means
comparing across an environment change — worthless for latency numbers.

## 2. Storage: `effect/unstable/sql`, three dialects

In Effect v4 the SQL stack lives in the core package — `SqlClient`,
`Migrator`, `SqlResolver`, `SqlSchema`, `SqlModel` under
`effect/unstable/sql/*` — with thin per-dialect driver packages. All three
engines c15t cares about are published on the v4 beta line at
`4.0.0-beta.102`: `@effect/sql-pg`, `@effect/sql-mysql2`,
`@effect/sql-sqlite-node` (plus `-bun`). There is no `@effect/sql` install on
v4; it folded into core, which is why that package has no beta tag.

**The tension to be honest about: `@effect/sql-kysely` has no v4 release**
(`latest` is `0.48.0`, v3-era). On v4 the idiomatic path is `SqlClient` with
typed template-literal SQL, not a query builder:

```ts
const rows = yield* sql<{ id: string; name: string }>`SELECT ...`
```

For a backend whose entire query surface is currently join-less single-table
calls, hand-written SQL is the point rather than a regression — we are
rewriting these queries as real SQL either way. Where a builder would
genuinely earn its keep is dynamic predicate construction in the list
endpoints. Mitigations in the stack: `SqlResolver` for batched
`findById`-style access with schema-validated requests and responses, and
`SqlSchema`/`SqlModel` for decoded row shapes instead of `as`-casts. If
dynamic composition turns out to be painful in practice, that is the strongest
argument for taking Effect v3 plus `@effect/sql-kysely` instead (§10.2).

Real SQL — joins, CTEs, window functions, `ON CONFLICT` with a conflict
target — is available on all three engines regardless of which of those two
paths we take.

**What is dropped, honestly:**

- **MongoDB.** The only genuine casualty, and the thing forcing the join-less
  design on every other user. Dropping it needs an export/import script, not
  a migration — there is no DDL path from Mongo to SQL. That script is part of
  the deliverable, not an exercise for the user.
- **The Drizzle/Prisma/TypeORM adapters.** Those users keep their database;
  they lose the shared connection pool, since c15t opens its own `SqlClient`
  connection against the same server. In exchange they get a migrator that
  actually runs, which they have never had (see Problem). Net positive, but
  the extra pool is a real cost and should be documented as one.

## 3. Migrator

Every shipped version must upgrade, and those paths must be tested. Shipped
majors/minors of `@c15t/backend`: `0.0`, `1.0`–`1.8`, `2.0`–`2.2` (`latest` is
`2.1.0`). That is a wider surface than the two schema versions suggest, for a
reason that only shows up in history.

### 3.1 Three shapes shipped; only one is unreproducible

Inspecting the published tarballs (`npm pack @c15t/backend@<v>`) shows three
distinct eras, not two:

| Era | Package versions | Data layer | Version marker |
| --- | --- | --- | --- |
| Legacy | 1.0.x–1.8.x (root export) | `pkgs/migrations` + `pkgs/db-adapters` (kysely, drizzle, prisma, memory) | none |
| fumadb 1.0.0 | 1.8.x via the opt-in `/v2` subpath | fumadb, namespace `c15t` | `c15t_settings` = `1.0.0` |
| fumadb 2.0.0 | 2.x (the `/v2` surface promoted to root) | fumadb, namespace `c15t` | `c15t_settings` = `2.0.0` |

The middle row matters. 1.8.6 ships **both** systems: its root export is
`dist/core.js` (legacy), while `./v2/db/schema`, `./v2/db/migrator` and
`./v2/db/adapters/*` expose a fumadb schema at version `1.0.0` with exactly
the seven tables in `packages/backend/src/db/schema/1.0.0/` — `auditLog`,
`consent`, `consentPolicy`, `consentPurpose`, `consentRecord`, `domain`,
`subject`.

So `schema/1.0.0/` is **real shipped code, not a retrospective
reconstruction**. Its single-commit history (`236360c2`, `feat: 2.0 (#533)`)
is an artifact of the long-lived 2.0 branch being squash-merged, not evidence
that the schema was invented after the fact. Fixtures for the two fumadb
shapes can be generated faithfully from shipped code.

This also makes detection more tractable than it first appeared: read
`c15t_settings` and you have the exact schema version; its absence means
legacy. The genuinely unreproducible shape is the legacy one — and since
`/v2` was opt-in, it is also likely the most common.

### 3.2 The legacy shape is a family, not a version

Within the legacy era specifically, there is no single "1.x schema". That
system diffed code against the live database and applied whatever was
missing. It was strictly additive — `migration-builders.ts` exports only
`buildColumnAddMigrations` and `buildTableCreateMigrations`, and
`schema-comparison.ts:188` states:

```
// We don't alter column types to avoid data loss, just log a warning
```

No drops, no type changes, no ledger table. So a database created at 1.0 and
walked up to 1.8 can carry columns a fresh 1.8 install never had, and nothing
on disk distinguishes them. There is no version marker to read either —
`c15t_settings` (fumadb writes `${namespace}_settings`, namespace `c15t`)
only exists once a database has been through the fumadb path, whether via
1.8.x's `/v2` opt-in or 2.x. This is why `src/db/migrator/index.ts:45`
catches and falls back to `version = 'legacy'` with `mode: 'from-database'`.

Practical consequence: legacy fixtures cannot be derived from any schema
definition in this repo. They have to be produced by running the real
packages (§3.4).

### 3.3 Design — use Effect's `Migrator`, own the adoption step

`effect/unstable/sql/Migrator` already provides most of what an earlier draft
of this RFC specified by hand: a dedicated migrations table with dialect-aware
creation, duplicate-ID detection, concurrent-run guarding, per-migration logs
and spans, and transaction/locking semantics from the client. Migrations are
an ordered record of effects, loaded and run through the runtime:

```ts
const migrations = PgMigrator.fromRecord({
  '1_baseline': Effect.gen(function* () { /* … */ }),
  '2_add_index': Effect.gen(function* () { /* … */ }),
})
```

We do not rebuild that. What Migrator does *not* cover is the reason §3.2
exists: it assumes a linear list against a ledger it owns. A 1.x database has
no ledger and an unknown shape. So the piece we own is a **baseline adoption
step** that runs before the ordered list:

- **Detect by introspection, not lookup.** Read `c15t_settings` when present
  (2.x); otherwise sniff tables and columns. "1.x-ish with unknown extra
  columns" is a legitimate, expected input state.
- **Converge, then stamp.** Bring the live database to the 3.0.0 baseline —
  dropping and retyping deliberately, after moving data — then write the
  ledger row so Migrator takes over cleanly from that point forward. Unlike
  the pre-2.0 system, convergence is allowed to be destructive; unlike a naive
  linear chain, it does not assume where it started.
- **`--dry-run` prints the exact SQL** before anything is touched.
- **Idempotent and resumable** — safe to re-run after a mid-flight failure.
- **Per-step transactions on Postgres/SQLite.** MySQL DDL is not
  transactional; that path needs per-step checkpointing rather than pretending
  it can roll back.

After adoption, every future migration is an ordinary Migrator entry. The
bespoke logic is a one-time on-ramp, not permanent infrastructure.

### 3.4 Ground truth comes from npm

Fixtures are produced by installing real published packages, running each
one's own migrator against blank sqlite/mysql/postgres, and dumping the
resulting DDL. Published stable versions are `1.0.0, 1.0.5, 1.2.0, 1.2.1,
1.3.0, 1.3.1, 1.4.1, 1.4.2, 1.5.0, 1.6.0, 1.7.0, 1.7.1, 1.8.0, 1.8.4, 1.8.5,
1.8.6, 2.0.0, 2.0.2, 2.0.4, 2.1.0`.

| Fixture | Produced by | Path |
| --- | --- | --- |
| `legacy-fresh-1.0` | `@c15t/backend@1.0.0` | root export, `pkgs/migrations` |
| `legacy-fresh-1.8` | `@c15t/backend@1.8.6` | root export, `pkgs/migrations` |
| `legacy-upgraded` | `1.0.0` → `1.4.2` → `1.8.6` in sequence | root export, same database |
| `fumadb-1.0.0` | `@c15t/backend@1.8.6` | `/v2/db/migrator` |
| `fumadb-2.0.0` | `@c15t/backend@2.1.0` | `db/migrator` |

`legacy-upgraded` is the one that cannot be substituted by a fresh install —
§3.2 is precisely the claim that it differs, and if it turns out not to, that
is a finding worth recording rather than an assumption worth making.

Driver availability is not a blocker: `@c15t/backend@1.0.0` already depends on
`better-sqlite3`, `mysql2`, `pg` and `kysely`, so each package brings what it
needs to talk to all three engines.

**Sequencing:** generate these fixtures *before* the fumadb removal lands.
Afterwards, reproducing those shapes faithfully gets much harder.

### 3.5 Open question inherited from 2.0

`consentRecord` is in the 1.0.0 schema, absent from 2.0.0, and there is no
data-migration code anywhere in the repo — the only other reference is an
unrelated local variable in `post.handler.ts`. Whatever happened to that
table's contents on 1.x → 2.x, c15t did not move it. Establish the current
behaviour against a real 1.x database before deciding whether to inherit it.

## 4. Effect scope

Backend only. It is server-side, so none of the bundle-size pressure that
would argue against Effect in `core` applies.

Where it earns its place:

- **Layers** for db / cache / config / logger DI, replacing the ad-hoc
  `C15TContext` threading.
- **Tagged errors** replacing `throw new Error` plus try/catch, so handler
  failure modes are in the type signature.
- **`Effect.forEach` with bounded concurrency** replacing the hand-rolled
  batch loops in `list.handler.ts` and `consent-enrichment.ts`.
- **`SqlResolver`** for the batched lookups those loops are badly
  approximating — request-style batching with schema-validated inputs and
  outputs is a direct answer to the N+1s in the Problem section.
- **`Schedule`** replacing the bespoke retry/backoff in `generateUniqueId`.

**Version.** Effect v4 is `4.0.0-beta.102`; `latest` is still `3.22.1`. Pin
exact and bump deliberately — `bunfig.toml` sets `minimumReleaseAge: 3 days`,
so a freshly cut beta will not resolve.

The SQL story sharpens this choice rather than complicating it. v4 ships
`SqlClient` and `Migrator` in core with all three dialects published on the
beta line, so taking v4 means the storage layer and the migrator both come
from the framework. v3's counter-offer is `@effect/sql-kysely`, which v4 does
not have. See §10.2.

**Pilot surface: the migrator.** CLI-invoked, side-effecting, failure-prone,
wants retries and resume, and has zero hot-path performance concerns. It
proves the Layer/tagged-error patterns before anything touches the request
path.

## 5. Observability: evlog

Replace `@c15t/logger` in the backend with evlog (`2.22.4`).

- `evlog/hono` is a first-class integration; one wide event per request
  replaces `logger.debug` scattered across 22 files.
- **Auto-redaction** (email, ipv4, JWT, bearer) on a product that processes IP
  addresses is a compliance asset, not a nicety.
- **`log.audit`** maps onto the existing `auditLog` table rather than standing
  up a parallel logger.
- The **OTLP drain** composes with the OTel spans already emitted by
  `withDatabaseSpan`, so logs and traces finally correlate.

**Caveat, and why it resolves.** evlog's Hono binding has no `useLogger()`
across async boundaries — the logger is passed explicitly via `c.get('log')`.
That is already the shape here (logger threaded through `ctx` into every
registry function), so it is not a regression, and Effect's Context/Layer
solves it properly by making the logger a service. The two decisions reinforce
each other.

**`@c15t/logger` survives.** `packages/cli` depends on it, where it is
effectively a pretty-printer. It is not deleted, only dropped from the
backend.

## 6. Testing

The right primitive already exists and was used exactly once:
`post.handler.integration.test.ts` (190 lines) spins up PGlite, runs real
migrations, and asserts against real constraint codes. That becomes the house
pattern rather than a one-off — and it carries over natively:
**`@effect/sql-pglite` is v4-only** (its `latest` *is* `4.0.0-beta.102`), so
the in-process Postgres harness is a first-class Layer rather than a
test-only workaround.

| Level | Boundary | Runs against |
| --- | --- | --- |
| Unit | Pure logic — resolvers, ID generation, policy matching | No I/O |
| Integration | Handler → registry → database | Real engine, seeded |
| Migration | Old shape → 3.0.0 | Fixtures from §3.4 |
| Smoke | Boot, health, one write, one read | Built artifact |
| E2E | CLI `self-host migrate` → server → client SDK | Full stack |

Migration matrix: the five fixtures in §3.4 plus `empty` (fresh install)
× 3 engines. Seed every fixture with real rows and assert **data preservation
and FK integrity**, not merely that the DDL executed.

Coverage floor for the new package starts at the old package's 55% and
ratchets up; it never ships below parity.

## 7. Benchmarking

This is the reason for a parallel package, so it is a first-class deliverable
rather than a follow-up.

### 7.1 Reuse the existing harness

`benchmarks/shared` already has the schema (`BenchmarkResult`,
`BENCHMARK_SCHEMA_VERSION`), budget evaluation, markdown comparison, and — most
usefully — `arm-map.json`, which maps new arms onto baseline arms. The v3
frontend work already uses it this way (`v3-tiny` → `tiny`). The backend
benchmark maps `v3-*` arms onto `v2-*` baselines with the same mechanism, and
CI's existing Benchmark Regression comment picks it up for free.

Two schema extensions are needed, both additive so existing reports keep
validating:

- `BenchmarkSuite` gains `'backend-runtime'`; `BenchmarkFramework` gains
  `'backend'`.
- `BenchmarkFixtureDescriptor` is browser-shaped (`scriptCount`,
  `localeCount`, `themeComplexity`). Add optional server fields: engine, row
  counts per table, connection-pool size.

### 7.2 What to measure

Both packages, same fixtures, same engine, same process:

- **Consent save** (`POST /subjects`) — p50/p95/p99 wall time, and **query
  count per request**. Query count is the honest metric for the join-less
  problem; latency alone hides it on a warm local database.
- **Subject list with consents** (`GET /subjects?externalId=`) — the chunked
  fan-out in `list.handler.ts`, swept across 1 / 10 / 100 / 1000 subjects.
  This is where a lateral join should show a shape change, not a constant
  factor.
- **Consent enrichment** — the sequential per-policy-type loop, swept across
  policy-type counts.
- **`/init` and `/manifest`** — cache-warm and cache-cold.
- **Migration wall time** per fixture per engine, so upgrade cost is a tracked
  number rather than a surprise.

Record row counts and query counts alongside timings. A latency win that comes
with a query-count win is a design win; one without is a benchmarking
artifact.

## 8. Rollout

1. Scaffold the private package; port types and express the frozen 2.0.0
   schema as the `1_baseline` migration plus `SqlModel` row definitions.
2. **Generate migration fixtures from real npm packages (§3.4) — before any
   fumadb removal.**
3. Build the migrator in Effect (pilot surface, §4).
4. Port read paths, then write paths, contract-tested against the old package.
5. Stand up the benchmark arms (§7) as soon as one comparable path exists —
   not at the end.
6. evlog wiring, wide events, audit.
7. Parity gate: integration + migration suites green on three engines, and
   benchmarks no worse on any tracked metric.
8. Cutover: rename to `@c15t/backend`, join the linked group, major release
   with the Mongo export script and an upgrade guide.

## 9. Risks

- **Effect v4 is beta.** Mitigated by pinning exact and keeping Effect
  server-side, where a breaking change cannot reach published browser bundles.
- **The migrator is the whole risk surface.** Everything else is verifiable
  against a frozen contract; migrations touch other people's production data.
  Hence fixtures from real packages, dry-run, and data-preservation assertions.
- **Two backends to maintain during the parallel phase.** Bounded by the
  no-schema-changes rule and by keeping the parallel phase short.
- **Mongo users are a hard break.** Needs the export script and an honest
  migration note, decided before announcement, not after.

## 10. Open decisions

1. ~~**Mongo — confirmed gone?**~~ **Decided: MongoDB support is dropped.**
   The new package has no Mongo path. The existing `@c15t/backend` keeps its
   Mongo adapter until cutover, since it stays on the shipping line
   untouched (§1); removal is announced with the major, together with the
   export/import script (§2).
2. **Effect v4 beta, pinned — or v3 stable?** No longer a pure risk question,
   because the two paths give different storage layers. v4: `SqlClient` +
   `Migrator` in core, all three dialects and PGlite on the beta line, no
   query builder. v3: stable, plus `@effect/sql-kysely` if a typed query
   builder for dynamic predicates turns out to matter. Recommend v4 — the
   built-in migrator and the v4-native PGlite harness are worth more here
   than a builder — but this is the call to make consciously.
3. **Working package name** during the private phase (it is renamed at
   cutover, so this is low-stakes).
4. **`consentRecord` (§3.5)** — reproduce current behaviour first, then decide
   whether to preserve that data on upgrade.
