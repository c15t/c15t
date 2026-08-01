# @c15t/migration-fixtures

Ground-truth database shapes captured from **published** `@c15t/backend`
releases, used to test that the v3 migrator upgrades real databases correctly.

Supports RFC 0004 §3. Not published; not part of any build.

## Why these are generated from npm

The shapes a user's database can be in are determined by the release that
created it, not by the schema definitions in this repo. For the fumadb eras
those two happen to agree, but for the legacy era there is no schema
definition here at all — that code was replaced in 2.0. Generating fixtures
from anything other than the real releases would test our understanding of
history rather than history itself.

Each fixture is produced by installing the release into a throwaway workspace,
running **that release's own migrator** against a blank database, and
capturing the result.

## Shapes

| Shape | Released by | Migrator entry | Marker table |
| --- | --- | --- | --- |
| `legacy-fresh-1.0` | `1.0.0` | `pkgs/migrations` (root) | none |
| `legacy-fresh-1.8` | `1.8.6` | `pkgs/migrations` (root) | none |
| `legacy-upgraded` | `1.0.0` → `1.4.2` → `1.8.6` | `pkgs/migrations` (root) | none |
| `fumadb-1.0.0` | `1.8.6` | `v2/db/migrator` (opt-in subpath) | `private_c15t_settings` = `1.0.0` |
| `fumadb-2.0.0` | `2.1.0` | `db/migrator` (root) | `private_c15t_settings` = `2.0.0` |

## Findings

**There is one legacy shape, not a family.** RFC §3.2 reasoned that because the
legacy migrator was strictly additive with no ledger, a database created at 1.0
and upgraded to 1.8 could retain columns a fresh 1.8 install never had.
Measured, that does not happen: `legacy-fresh-1.0`, `legacy-fresh-1.8` and
`legacy-upgraded` are **identical** in tables and columns on both sqlite and
postgres. The legacy schema simply never changed across the 1.x line, so an
additive migrator converges on the same result either way.

`legacy-upgraded` is kept anyway — it is the regression test for that claim,
and it costs nothing to keep generating.

Verified on sqlite, postgres **and** mysql, each shape against a genuinely
blank database.

**fumadb cannot migrate MySQL at all, and it is not fixed on the v3 line.**
Both `fumadb-1.0.0` and `fumadb-2.0.0` fail on a blank MySQL database with:

> BLOB/TEXT column '…' used in key specification without a key length

fumadb maps a `string` column to MySQL `TEXT` and then indexes it; MySQL
requires a prefix length to index TEXT/BLOB. Different eras trip over
different columns — `domain.name` at schema 1.0.0,
`runtimePolicyDecision.dedupeKey` at 2.0.0 — but the cause is the same.

Reproduced against **both** `fumadb@0.2.2` (pinned by the released 2.1.0) and
`fumadb@0.3.0` (pinned by this repo on the v3 line), using the real c15t
schema. A minimal schema with an `idColumn` migrates fine on both versions, so
this is specific to c15t's schema rather than a blanket fumadb defect.

MySQL is advertised in `docs/self-host/guides/database-setup.mdx`. Two
implications: fumadb-managed MySQL databases most likely **do not exist in the
wild**, since the documented migrator could never have created one; and MySQL
self-hosting is broken on the current v3 line, which is a live bug independent
of the rewrite.

Those cells are committed as `mysql.unsupported.json` so the absence is a
recorded finding rather than a coverage gap.

**No foreign key column is indexed, in any shipped version.** Across both
eras, the only non-primary indexes that exist anywhere are `domain.name`
(legacy) and `runtimePolicyDecision.dedupeKey` (2.0.0). Postgres does not
create an index on the referencing side of a foreign key, so
`consent.subjectId`, `consent.domainId`, `consent.policyId` and
`auditLog.subjectId` are all unindexed.

That is likely the dominant scaling problem, ahead of the join-less query
surface: the chunked `subjectId in (…)` fan-out in `list.handler.ts` is a
sequential scan of `consent` per chunk. Adding those indexes is a
post-cutover change (the baseline has to reproduce the shipped shape, not
improve on it), but it belongs in the benchmark story — RFC §7 measures query
count and latency precisely so this shows up as a number.

**Foreign keys exist on Postgres and SQLite but not on MySQL.** The legacy
migrator emits 6 foreign keys on Postgres and SQLite and **zero** on MySQL, so
referential integrity in shipped c15t depends on which engine you chose. The
adoption step has to treat adding foreign keys to a MySQL database as a
migration that can *fail* on pre-existing data, not as a formality.

**Scope of these claims.** Captured metadata is tables, columns (name, data
type, nullability, auto-increment, default presence), indexes and foreign
keys. Check constraints and column defaults' actual expressions are still not
captured. The "one legacy shape" finding now holds **including indexes and
foreign keys** on all three engines.

## Regenerating

```bash
# every in-process shape (sqlite + postgres)
bun run generate

# narrow it down
bun run generate --shape legacy-upgraded
bun run generate --engine sqlite

# keep the throwaway workspace to debug a failure
bun run generate --shape fumadb-1.0.0 --keep-workspace
```

MySQL needs a real server, so it is opt-in and generated locally rather than in
CI (RFC §7 keeps Docker off CI's critical path — CI verifies against the
committed dumps instead):

```bash
docker run --rm -d -p 3399:3306 \
  -e MYSQL_ROOT_PASSWORD=c15t -e MYSQL_DATABASE=c15t \
  --name c15t-fixtures mysql:8

bun run generate --engine mysql --mysql-url mysql://root:c15t@127.0.0.1:3399/c15t

docker stop c15t-fixtures
```

## Implementation notes

Things that are load-bearing and non-obvious:

- **Releases are installed on demand**, not declared as dependencies.
  Generation is rare and the old releases drag native drivers and a MongoDB
  client behind them; nobody running `bun install` should pay for that.
- **The driver runs under Node, not Bun.** `better-sqlite3`'s NAPI module hard
  crashes the Bun runtime (`NAPI FATAL ERROR: Error::New`). Bun still performs
  the install.
- **The driver hands its result back through a file**, not stdout. 1.8.6's
  legacy migrator logs to stdout, which corrupts a stdout handoff.
- **kysely is pinned to the range each release declares**, not `latest`.
  kysely 0.29 dropped the `Migrator` export that `kysely-pglite` still imports,
  and a release should be exercised against its own dependency anyway.
- **`migrator()` returns a plan, not a result.** Nothing touches the database
  until `plan.execute()` — the CLI does the same thing at
  `packages/cli/src/commands/self-host/migrate/migrator-result.ts:51`.
- **MySQL is dropped to a blank schema before every shape.** sqlite and
  postgres get a fresh in-process database per run; MySQL is a shared server,
  so without this each shape migrates whatever the previous one left behind.
  That changes the migration *path*, not just the result — an earlier version
  of this tool reused one database and produced both a spurious failure mode
  and a spurious "all legacy shapes are identical" result.
