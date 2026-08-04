# RFC 0004: Backend Rewrite — Effect SQL and a Measured Parallel Package

Status: **In progress.** MongoDB removal confirmed, Effect v4 taken. Steps 1–4
of §8 are implemented and measured; §11 records what building them changed
about this document. Remaining decisions in §10.

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
  a migration — there is no DDL path from Mongo to SQL. **Superseded by
  §11.8: that script is not being written.**
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

This also makes detection more tractable than it first appeared: where
`private_c15t_settings` exists it names the exact schema version, no guessing
required. **Its absence does not mean legacy, though** — see §3.5. The
genuinely unreproducible shape is the legacy one, and since `/v2` was opt-in,
it is also likely the most common.

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

**Measured (`internals/migration-fixtures`): the drift does not occur.**
`legacy-fresh-1.0`, `legacy-fresh-1.8` and `legacy-upgraded`
(`1.0.0` → `1.4.2` → `1.8.6`) are byte-identical in tables and columns on both
sqlite and postgres. The legacy schema simply never changed across the 1.x
line, so an additive migrator converges on the same result whichever route a
database took. There is **one** legacy shape to migrate, not a family.

That is a materially easier problem than this section originally assumed, and
it simplifies §3.3's adoption step: the legacy branch has a single known
source shape rather than an open-ended one. Two bounds on the claim — captured
metadata is tables and columns only, so indexes, foreign keys and check
constraints could still differ; and only the `1.0.0 → 1.4.2 → 1.8.6` chain was
walked. `legacy-upgraded` stays in the matrix as the regression test that keeps
this true.

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

- **Detect by introspection, not lookup — and never by marker absence.**
  `private_c15t_settings` is authoritative *when present*: it names the schema
  version outright. When it is missing, the database must be classified by its
  actual tables and columns, because absence covers at least three different
  populations: a legacy database, an empty database, and a fumadb-shaped
  database created through the `generateSchema()` ORM path that fumadb's
  migrator never touched (§3.5). Treating "no marker" as "legacy" would apply
  a legacy convergence to a database already at 2.0.0.

  The fixtures make this cheap to get right, and every marker-less population
  is separable:

  - **2.0.0 vs everything else** by table set — `runtimePolicyDecision` exists
    only at 2.0.0, `consentRecord` only in the legacy and 1.0.0 shapes.
  - **Legacy vs fumadb 1.0.0** by column type. They carry the *same* seven
    tables, but legacy emits `jsonb` and `text` where fumadb emits `json` and
    `varchar`, and they disagree on which columns have defaults (verified on
    postgres fixtures).

  So classification is a comparison against committed fixtures, not
  heuristics — which is a second reason to close the index/FK capture gap
  before the adoption step relies on it.
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

`legacy-upgraded` was included because §3.2 predicted it would differ from a
fresh install. Measured, it does not — see §3.2. It stays as the regression
test for that result.

Driver availability is not a blocker: `@c15t/backend@1.0.0` already depends on
`better-sqlite3`, `mysql2`, `pg` and `kysely`, so each package brings what it
needs to talk to all three engines.

**Sequencing:** generate these fixtures *before* the fumadb removal lands.
Afterwards, reproducing those shapes faithfully gets much harder.

### 3.5 MySQL is already broken on the fumadb path

Measured while generating fixtures: **fumadb cannot migrate a blank MySQL
database**, on either schema version.

```
BLOB/TEXT column '…' used in key specification without a key length
```

fumadb maps a `string` column to MySQL `TEXT` and then indexes it; MySQL
requires a prefix length for TEXT/BLOB indexes. Schema 1.0.0 trips on
`domain.name`, schema 2.0.0 on `runtimePolicyDecision.dedupeKey`. Reproduced
against `fumadb@0.2.2` (pinned by the released 2.1.0) **and `fumadb@0.3.0`,
which this repo pins on the v3 line** — so it is not fixed upstream. A minimal
schema with an `idColumn` migrates cleanly on both versions, so this is
specific to c15t's schema rather than a blanket fumadb defect.

Two consequences:

- **For this RFC:** no MySQL database was ever created *by fumadb's migrator*,
  so the migration matrix loses two cells (§3.4 records them as
  `mysql.unsupported.json` rather than leaving a silent hole).

  That is **not** the same as "no MySQL database has the fumadb shape". The
  Drizzle/Prisma/TypeORM path never used fumadb's migrator at all — it printed
  schema code via `generateSchema()` for the user to apply with their own ORM
  tooling. A MySQL user on that path ends up with a database that has the
  fumadb *shape* but was never touched by fumadb, and therefore has **no
  `private_c15t_settings` row**. Marker-absence and legacy are not the same
  population, and §3.3's detection must not conflate them.
- **Outside this RFC:** `docs/self-host/guides/database-setup.mdx` advertises
  MySQL, and it is broken on the current v3 line today. That is a live bug
  worth fixing or documenting independently of the rewrite — it should not
  wait on cutover.

### 3.6 Open question inherited from 2.0

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
4. ~~**`consentRecord` (§3.6)**~~ **Resolved by §11.2: adoption never drops
   anything**, so `consentRecord` and every removed column stay in place and
   are reported to the operator.

## 11. What implementation changed

Recorded as it happened, because several of these contradict what earlier
sections of this document originally claimed.

### 11.1 Predictions that did not survive contact

- **Legacy schema drift does not occur.** §3.2 reasoned that a strictly
  additive migrator with no ledger would let a 1.0→1.8 database keep columns a
  fresh 1.8 install never had. Measured across all three engines, including
  indexes and foreign keys: it does not. The legacy schema never changed
  across the 1.x line, so there is **one** legacy shape.
- **`schema/1.0.0/` is shipped code, not a reconstruction** (§3.1). The
  single-commit history was a squash-merge artifact.
- **Marker absence does not mean legacy** (§3.5). The `generateSchema()` ORM
  path produced fumadb-shaped databases fumadb never touched.

### 11.2 Adoption is additive, and that is a hard rule

Going 1.0.0 → 2.0.0 removed columns holding real data — `consent.status`,
`consent.withdrawalReason`, `consentPolicy.content` — and dropped
`consentRecord` outright. On a consent platform those are withdrawal history
and audit records.

Adoption therefore creates tables and adds columns and **never drops a table,
drops a column, or changes a type**. An adopted database is baseline *plus
whatever it already had*, with the extras reported so an operator can remove
them deliberately later.

This weakens the fresh-equals-adopted claim in §8 and the wording should be
read accordingly: the two are identical **in the columns the contract covers**,
not byte-identical. That is the parity that matters, and it is what
`baseline.test.ts` asserts.

### 11.3 Two defects found in the shipped product

Neither is caused by this rewrite; both are live on `v3` today.

- **fumadb cannot migrate MySQL at all** (§3.5). Not fixed in `fumadb@0.3.0`.
- **No foreign key column is indexed in any shipped version.** The only
  non-primary indexes anywhere are `domain.name` (legacy, lost in 2.0.0) and
  `runtimePolicyDecision.dedupeKey`. Postgres does not index the referencing
  side of a foreign key, so the chunked fan-out in `list.handler.ts` was a
  sequential scan per chunk. This is plausibly a larger scaling problem than
  the join-less query surface that motivated the rewrite.

Also: the legacy migrator emitted foreign keys on Postgres and SQLite but
**none on MySQL**, so referential integrity in shipped c15t depends on the
engine. Adoption validates every foreign key before adding it and refuses with
a report rather than failing part-way.

### 11.4 The indexes ship with v3, not backported

**Decided: the index migration is not backported to `@c15t/backend` 2.x.**

It could be. Migration 2 is independent of Effect, and the measurement below
puts it at ~2× on the read path on its own, so 2.x users could have it now.
The call is to ship it with v3 anyway.

Two consequences worth stating, since neither is free:

- Users on 2.x stay on the unindexed schema until v3 lands. That is the
  accepted cost, and it makes v3's timeline a performance question as well as
  a correctness one.
- The benchmark baseline stays 2.x-as-shipped, so the A/B stays clean and the
  decomposition in §11.5 keeps its meaning.

### 11.5 Indexes ship as migration 2, not in the baseline

§7 originally deferred the missing indexes to post-cutover to protect
fresh-equals-adopted. They are instead a separate migration immediately after
the baseline, which keeps convergence at migration 1 *and* fixes the problem
before cutover.

It also makes the improvement measurable in isolation. The benchmark arms must
report migration 1 and migration 2 separately, or a large indexing win will be
silently attributed to Effect.

**Measured** (`benchmarks/backend-bench`, 1000 subjects against 20k background
rows, PGlite). Three arms: the real `@c15t/backend` data layer, the same query
pattern against a bare SQL client, and the rewrite.

| arm | indexed | queries | median ms |
| --- | --- | ---: | ---: |
| `v2-backend` (real fumadb) | no | 9 | 16.516 |
| chunked fan-out (pattern only) | no | 9 | 8.513 |
| joined | no | 2 | 4.337 |
| `v2-backend` (real fumadb) | yes | 9 | 11.927 |
| chunked fan-out (pattern only) | yes | 9 | 4.489 |
| joined | yes | 2 | 3.273 |

The like-for-like comparison — same schema, same indexes, different
implementation — is **3.64×** (11.927 → 3.273). Unindexed it is 3.81×
(16.516 → 4.337), so the implementation win is roughly constant either way and
indexes add about 1.35× on top of either implementation.

Decomposed against the real baseline: **fumadb's own overhead accounts for
about half the v2 cost** (16.516 → 8.513 for the identical nine queries
against identical data), the join accounts for a further ~1.96×, and the
indexes ~1.35×.

**This supersedes an earlier reading in this section**, which used the
pattern-only arm as the baseline and concluded that roughly half the total
improvement was the index migration. Against the real package that is wrong:
the implementation change dominates, because the pattern-only arm silently
excluded fumadb's overhead. Keeping both arms is what surfaced the error —
running one would have left it invisible in either direction.

One caveat still understates the rewrite: PGlite is in-process, so nine
sequential round trips cost almost nothing here and would dominate against a
networked Postgres.

### 11.6 Tenant scoping is unindexed everywhere

`withTenantScope` (`packages/backend/src/db/tenant-scope.ts`) proxies the ORM
and injects a `tenantId` filter into every `findFirst`, `findMany`, `count`,
`updateMany` and `deleteMany` on every table — the proxy throws rather than
let an unscoped method through. Every table carries `tenantId`. **No shipped
version indexes it anywhere.**

So in a multi-tenant deployment every read in the system filters on an
unindexed column. That is a wider gap than the missing foreign key indexes,
which only affected join paths. Migration 2 covers all seven tables.

These are plain single-column indexes rather than `(tenantId, x)` composites:
single-tenant deployments never set `tenantId` and never reach the proxy, so
they need the bare column indexes, and keeping both sets serves both shapes.
Unlike the foreign key indexes, this rests on reading the query code rather
than on measurement — the benchmark has no multi-tenant arm yet, and adding
one is what should settle the composite question.

### 11.7 Two of the three supported engines did not work

The suite reached 180 passing tests, ~95% statement coverage, and a
cross-backend conformance runner while **the package could not execute a single
statement against MySQL, and could not write to SQLite at all.**

Every test used PGlite. SQLite appeared covered, but only for DDL and adoption;
MySQL had no arm at all. So the suite proved that Postgres worked and was read
as proving that the package worked.

What was actually broken:

| Defect | Effect |
| --- | --- |
| Identifiers quoted `"like this"` | MySQL rejects the syntax. Nothing ran. |
| `on conflict … do nothing returning` | MySQL 8 has neither clause. Every idempotent write. |
| `create index if not exists` | MySQL has no such clause for indexes. Migration 2. |
| Indexed and foreign key columns declared `text` | MySQL cannot index TEXT. The baseline itself failed. |
| `information_schema` read unaliased | MySQL uppercases the labels, so adoption saw an *empty* database, added no columns, and stamped the ledger as baseline anyway. |
| `consent.metadata` used to detect fumadb | Legacy MySQL declares it `json`, so a legacy database classified as fumadb 1.0.0. |
| `Date` and `boolean` bound directly | `node:sqlite` binds neither. Every SQLite write. |

Two are worth calling out beyond "it did not run". The adoption one is silent:
a legacy MySQL database would be *marked* as migrated while missing most of its
2.0.0 columns. And `mysql.timestamp` was mapped to MySQL's `timestamp` type,
which stops at 2038 and shifts through the session time zone — a `validUntil`
past 2038 and a time-zone-dependent `givenAt` on a legal record. It is now
`datetime(3)`, which is also what every legacy MySQL database already holds.

The fix that matters is not any of the above; it is
`repository/cross-engine.test.ts`. Behaviour is asserted against every engine
present, MySQL joining when `C15T_TEST_MYSQL_URL` is set. Not one of these
defects can recur silently, and none of them were findable by reading the code
— each was found by running it.

**Revision to §3.5.** That section says fumadb cannot migrate MySQL. True, and
incomplete: the MySQL column of the physical type table had no fixture behind
it, because the fumadb-era MySQL fixtures record a failure rather than a
schema. The evidence for MySQL is the `legacy-…` fixtures, which is what
`dialect.ts` now cites.

**Testing note for §6.** Opting into MySQL also disables vitest's file
parallelism. PGlite and SQLite get a fresh in-process database per test; MySQL
is one shared schema, and two files migrating it concurrently fail depending on
scheduling — passing individually, failing together.

### 11.8 No MongoDB migration path ships

**Decided: the Mongo export/import script promised in §2 is not being
written.** §8 step 8 loses it as a cutover deliverable.

The consequence, stated plainly so it is not discovered later: a 2.x
deployment on MongoDB has **no supported upgrade path to 3.0**. Not a lossy
one or a manual one — none. Those users stay on 2.x, or export and reshape
their data themselves against the schema in `db/schema.ts`.

This needs to be in the 3.0 release notes and the upgrade guide as a stated
break, not left as an omission. It is the one drop in this rewrite that
removes capability from an existing user rather than relocating it.

### 11.9 evlog is opt-in, and narrower than §5 described

§5 says "replace `@c15t/logger` in the backend with evlog". There was nothing
to replace: `backend-next` never had logging at all, so this was additive, and
that changed what the right default is.

**On by default, quiet by default.** The first cut of this defaulted logging
*off*, reasoning that 2.x emits nothing per request. That was half right and
the wrong conclusion: 2.x defaults to `level: 'error'`, so it does report
failures — and a backend that tells a new self-hoster nothing when their
requests are being rejected is one they debug by guesswork.

So the default is `level: 'warn'`: **silent when requests succeed, a line when
they do not.** The full per-request stream is `level: 'info'`, `'silent'` is
off, and `'inherit'` leaves evlog's global config to a host application that
configures it themselves.

Getting that default to actually work took two mechanisms, which is worth
knowing before changing any of it. Hono answers a thrown handler error with a
500 *response* rather than propagating it, so evlog's middleware sees a status
and never an exception, and the event's level stays `info` even for a 500.
Head sampling alone therefore drops exactly the requests worth keeping —
observed, not predicted: with `rates: { info: 0 }` the 500 vanished. It needs
a status-grading middleware running inside evlog's wrapper *and* a keep rule
from 400 up.

Redaction is on by default whenever logging is on, because the failure mode of
forgetting is a compliance incident.

**A narrow service, not evlog's logger.** The Effect service is `RequestLog`,
two methods wide, adapted from evlog at the HTTP boundary. Handlers depend on
"somewhere to record fields" rather than on evlog, the disabled case is a
two-line no-op instead of a stub of someone else's interface, and tests assert
against a recording implementation.

§5's caveat about `useLogger()` was checked rather than assumed, and holds at
2.22.4: the Hono integration only does `c.set('log', logger)` and sets up no
async storage. `makeRun` therefore takes the Hono context and provides `Log`
alongside `Tenant`, which is the same shape tenant scoping already uses.

**Two things §5 promised that this does not do.**

- **`log.audit` is not wired to the `auditLog` table.** That table is the
  product's legal record, written transactionally beside the row it describes.
  Making it depend on a logging library — sampled, drained, best-effort — would
  be a regression dressed as an integration. Audit entries stay in the
  database; the wide event records that one was written.
- **No OTLP drain is configured.** `drain` is exposed as an option instead. A
  library that picks its own telemetry destination is a library fighting its
  host; the deployment chooses.

**A vacuous test, caught.** The first redaction test asserted an IP header
never appeared in the emitted event, and passed — but it also passed with
`redact: false`, because no field this package sets carries PII and evlog does
not put request headers in the event body. It proved nothing. Replaced with a
direct assertion on the resolved default, which is the decision that can
actually regress. Worth recording as the same failure mode as §11.7: a test
that cannot fail is indistinguishable from coverage until someone tries to
break it.

### 11.10 The cutover blocker was a missing public API, not the rename

§8 step 8 describes cutover as "rename to `@c15t/backend`, join the linked
group, major release". Checking what the rename would actually require turned
up something that section assumes and never states: **`backend-next` had no
public API at all.** Its `index.ts` was `export {}`. A complete, tested backend
with no way to use it — and no internal coverage could have caught that,
because every test reached past the entry point.

The nine dependents import `c15tInstance`, `policyPackPresets`, `composePacks`,
`policyBuilder`, `defineConfig` and `C15TOptions`. None existed.

**Now built** (`instance.ts`, `db/connect.ts`, `define-config.ts`,
`policy/builder.ts`, a real `index.ts`):

- `c15tInstance(options).handler(request)` — deliberately the same two-call
  shape as 2.x, so no host integration is rewritten by the cutover.
- **`database` replaces `adapter`.** Either `{ dialect, url }` or a `SqlClient`
  layer. The config form exists so a self-hoster never has to learn `Layer`,
  `Redacted` and `@effect/sql-pg` to point the backend at a database; the layer
  form exists so that config form is not a dead end for anyone sharing a pool
  or embedding this in an Effect application. Drivers load dynamically, so a
  Postgres deployment does not pull `mysql2`.
- Policy authoring is **re-exported from `@c15t/schema`**, not reimplemented.
  Only `composePacks` and `policyBuilder` had to move; the matchers, presets
  and `inspectPolicies` were already shared, which is why a policy pack means
  the same thing in the browser and on the server.

**Decided: the adapter subpaths are removed outright**, not stubbed. There is
no `@c15t/backend/db/adapters/*` in 3.0 for Drizzle, Prisma, TypeORM, Kysely or
Mongo.

### 11.11 What cutover still needs

Mapped rather than estimated, by grepping every subpath import in the repo.

**`@c15t/cli` is the real remaining work.** Its `self-host migrate` command is
built on v2's internals — `db/migrator` in four files, `db/schema`, and all
five `db/adapters/*` in `ensure-backend-config.ts`. None of those exist here:
this package's migrator is `db/adopt.ts` plus Effect's `Migrator`, and there
are no adapters. That command needs rewriting against the new surface, and it
is a piece of work in its own right rather than a step in a rename.

Also outstanding:

- `@c15t/logger` reaches for `@c15t/backend/telemetry`.
- The rename itself: directory move, `private` removed, joining the linked
  version group, a major changeset.
- The benchmark and conformance harnesses import the real `@c15t/backend`,
  which is the point of them. Deleting the old package deletes the A/B. If the
  comparison is worth keeping past cutover, they need to depend on the
  published 2.x under an alias instead of on the workspace.
- Docs, which land before the 3.0 release.

### 11.12 Migration 2 was never actually runnable

Adoption stamped `1-baseline` and stopped. Nothing walked the numbered
migrations, so `2-hot-path-indexes` — the change worth roughly 1.35× on the
read path, and the answer to §11.6's unindexed tenant scoping — ran only in its
own tests. A migration nothing invokes is not shipped.

`db/migrate.ts` closes that: classify, adopt to the baseline if behind, then
apply whatever the ledger has not recorded. It is what the CLI will call and
what a self-hoster can call programmatically, and it takes `dryRun` because
this is the one code path in the package that touches other people's data.

**Not Effect's `Migrator`**, despite each `@effect/sql-*` exporting one. They
own a second ledger table — and `c15t_migrations` already exists, so two
ledgers would mean two disagreeing answers to "what has been applied" — and
they resolve migrations by scanning a directory at runtime, which does not
survive a consumer's bundler. Migrations are an explicit, statically imported
array instead.

**A driver bug found on the way.** `@effect/sql-sqlite-node` caches prepared
statements by SQL text and caches the **failures**: probing a table that does
not exist yet poisons that exact query for the life of the connection, so it
keeps failing after the table is created. Demonstrated directly — the same
query with one character of different whitespace succeeds, which is what a
cache-key collision looks like.

That is squarely in `migrate`'s path, since it reads the ledger before creating
it. Worked around by asking whether the ledger exists before reading it, which
is better code regardless. Worth reporting upstream.

Also corrected while testing this: a bare `subject` table is **not**
unclassifiable on MySQL. §11.7 made MySQL answer "legacy" by elimination,
because fumadb cannot migrate MySQL in either era — so the "refuse rather than
guess" case needs a fumadb marker naming an unknown schema version, which is
unrecognisable on all three engines.

### 11.13 The CLI's migrate command, rewritten

§11.11 called `@c15t/cli` the real remaining cutover work. It was smaller than
it looked, because most of what the command did existed only to work around
fumadb.

`self-host migrate` in 2.x asked which of five ORM adapters you used, then
which provider that adapter supported, then assembled a matching `adapter:`
expression and worked out which packages to install — 481 lines of it. Then it
branched: a real migration for Kysely and Mongo, or, for Drizzle, Prisma and
TypeORM, **writing a schema file for the operator to apply themselves**. And on
MySQL it could not migrate at all, whichever adapter was chosen.

There is one path now. One question — which engine, of three — and all three
migrate. The ORM branch is deleted outright rather than ported, along with
`orm-result.ts` and `migrator-result.ts`.

The command dry-runs first and always: it plans, prints what it found, and asks
before writing. `MigrateReport.retained` is surfaced in that output, because a
1.x database keeps the columns 2.0.0 dropped — `consent.status`,
`consentRecord` and the rest — and an operator should be told those survived
rather than discover it later.

**`createMigrator` exists so the CLI never imports Effect.** It wraps
`migrate()` as `plan`/`apply`/`dispose`. Requiring a `ManagedRuntime` to run one
migration would have been the same mistake as requiring a `Layer` to point the
backend at a database (§11.10), and the same reasoning applies to a
self-hoster's deploy script.

Imports still say `@c15t/backend-next`; the rename flips them in one pass.
