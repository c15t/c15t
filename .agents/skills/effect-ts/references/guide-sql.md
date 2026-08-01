# SQL Guide

This guide is based on the vendored Effect SQL modules in `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/effect/src/unstable/sql/SqlClient.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/Migrator.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlResolver.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlSchema.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlModel.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`

## Preferred Rule

When a project uses Effect, prefer the Effect SQL modules over directly coupling business code to a native SQL driver API.

Prefer:

- `effect/unstable/sql/SqlClient`
- `effect/unstable/sql/Migrator`
- `effect/unstable/sql/SqlResolver`
- `effect/unstable/sql/SqlSchema`
- `effect/unstable/sql/SqlModel`

Over:

- embedding raw driver calls directly in business services
- hand-rolling transactions in service methods
- ad hoc migration scripts disconnected from the Effect runtime

Why:

- transactions are integrated into the Effect model
- spans and SQL observability are built in
- SQL errors stay typed and consistent
- schema decoding and request resolution compose better
- layers and services stay portable across runtimes and tests

## Mental Model

The Effect SQL stack is organized around:

- `SqlClient` as the main database capability
- `withTransaction` for transaction boundaries
- `SqlResolver` for request-style batched and validated access
- `SqlSchema` and `SqlModel` for schema-aware query/model patterns
- `Migrator` for managed migrations

The business layer should depend on Effect SQL abstractions, not on a raw driver object.

## `SqlClient`

`SqlClient` is the primary service for executing SQL.

Repo reference:

- `./.repos/effect/packages/effect/src/unstable/sql/SqlClient.ts`

Use it when:

- you need to execute queries
- you need transactions
- you want SQL operations to participate in Effect spans and context

Important capabilities from the repo:

- transaction support with `withTransaction`
- connection reservation with `reserve`
- reactive queries
- integration with transaction-scoped context

## Typed Queries

Prefer typed SQL queries instead of leaving row shapes implicit.

The repo uses typed query literals like:

```ts
const rows = yield* sql<{ id: number; name: string }>`SELECT * FROM test`
```

This is the first level of typed SQL usage and is already better than untyped row access.

Use typed query literals when:

- the row shape is small and obvious
- the query is local and does not justify a reusable schema
- you want immediate row typing without introducing extra helpers

Avoid:

- leaving query results untyped and then recovering shape with unsafe assertions
- using `as` on rows after query execution

## Schema Integration

Prefer integrating SQL with Schema whenever the row shape matters or the query result crosses a meaningful boundary.

Why:

- Schema validates the shape rather than trusting the database blindly
- row decoding stays explicit and typed
- the same schema can often be reused for transport, domain, or contract layers
- this avoids unsafe row assertions such as `as TodoRow`

### Prefer schema-decoded results over `as`-based rows

Avoid this pattern:

```ts
const row = yield* sql`SELECT id, title FROM todos WHERE id = ${id}`
const todo = row[0] as TodoRow
```

Prefer:

- a typed SQL query plus Schema decoding
- or a SQL helper such as `SqlResolver`, `SqlSchema`, or `SqlModel` when appropriate

Example boundary decode:

```ts
const TodoRow = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})

const decodeTodoRows = Schema.decodeUnknownEffect(Schema.Array(TodoRow))
```

Then keep the query and decoding together in one SQL-aware operation.

### `SqlResolver` + Schema

`SqlResolver` is one of the clearest examples of SQL and Schema integration in the vendored repo.

It uses:

- a `Request` schema for validating resolver input
- a `Result` schema for validating query output

Example shape from the repo tests:

```ts
const resolver = SqlResolver.findById({
  Id: Schema.Number,
  Result: Schema.Struct({
    id: Schema.Number,
    name: Schema.String
  }),
  ResultId: (row) => row.id,
  execute: (ids) => sql`SELECT * FROM test WHERE id IN ${sql.in(ids)}`
})
```

This is a preferred pattern when:

- multiple IDs are fetched together
- request batching is useful
- the query contract should be schema-validated

### `SqlSchema` and `SqlModel`

Use `SqlSchema` and `SqlModel` when you want tighter schema integration with SQL itself.

They are preferred over hand-written row types when:

- the row shape is central to the module
- you want reusable schema-aware model logic
- manual row mapping is becoming repetitive

## Prefer SQL Services Over Native Driver Services

Avoid this pattern:

```ts
class TodoService extends Context.Service<TodoService, { ... }>()("TodoService") {
  static readonly layer = Layer.effect(this)(
    Effect.acquireRelease(
      Effect.try({ try: () => new Database("todos.sqlite") })
    )
  )
}
```

Why this is usually a bad pattern in an Effect codebase:

- the service is now tightly coupled to one runtime-specific database client
- you lose the shared SQL abstraction that the Effect repo already provides
- transaction and query conventions become ad hoc
- it is easier to drift away from typed SQL errors, SQL tracing, and reusable query helpers

Prefer a layer that provides `SqlClient`, and let domain services depend on that.

## Domain Services Should Depend On `SqlClient`

Good pattern:

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as SqlClient from "effect/unstable/sql/SqlClient"

class TodoRepo extends Context.Service<TodoRepo>()("TodoRepo", {
  make: Effect.succeed({
    getById: Effect.fn("TodoRepo.getById")(function*(id: number) {
      const sql = yield* SqlClient.SqlClient
      return yield* sql`SELECT id, title, completed FROM todos WHERE id = ${id}`
    })
  })
}) {}
```

Why this is better:

- the domain service depends on an Effect SQL capability
- SQL stays observable and transactional
- the SQL client implementation can be provided separately from the business service

## Transactions

Use `SqlClient.withTransaction` for transaction boundaries.

Repo reference:

- `./.repos/effect/packages/effect/src/unstable/sql/SqlClient.ts`

Prefer:

```ts
const createAndAudit = Effect.fn("TodoRepo.createAndAudit")(function*(title: string) {
  const sql = yield* SqlClient.SqlClient

  return yield* sql.withTransaction(
    Effect.gen(function*() {
      yield* sql`INSERT INTO todos ${sql.insert({ title, completed: false })}`
      yield* sql`INSERT INTO audit_log ${sql.insert({ event: "todo_created" })}`
    })
  )
})
```

Avoid:

- manual `BEGIN` / `COMMIT` / `ROLLBACK` in application service code
- driver-specific transaction logic spread across multiple service methods

## Query Composition

Prefer keeping query logic inside SQL-aware services or repositories.

Good patterns:

- keep queries close to the service that owns the behavior
- use named business operations for multi-step workflows
- use small local helpers only when they improve clarity

Avoid exposing one exported accessor function per SQL service method if it only forwards to the service.

Bad:

```ts
export const createTodo = Effect.fn(function*(title: string) {
  const todos = yield* TodoRepo
  return yield* todos.create(title)
})
```

Prefer:

- use the service method directly within the owning workflow
- or export a real business operation that adds behavior beyond simple forwarding

## SQL Resolvers

Use `SqlResolver` when request-style batching or schema-validated request/response handling is useful.

Repo reference:

- `./.repos/effect/packages/effect/src/unstable/sql/SqlResolver.ts`

It is especially good for:

- batched lookup patterns
- `findById`-style resolvers
- grouped query resolution
- integrating SQL with request batching patterns

Important repo pattern:

- request schema validates inputs
- result schema validates outputs
- execution remains effectful and transactional

This is one of the strongest typed-query patterns in the repo and should be preferred over ad hoc batched row mapping when the query fits the resolver model.

## SQL Schemas And Models

When schema-aware SQL helpers fit the task, prefer them over hand-mapped rows.

Look at:

- `SqlSchema`
- `SqlModel`

These are good fits when:

- the row shape matters strongly
- schema-based decode/encode should stay aligned with database access
- you want to reduce ad hoc row mapping logic

Avoid overusing manual `type Row = { ... }` plus custom conversion if the schema-aware modules already express the shape clearly.

Preferred order for query typing:

1. schema-aware SQL module such as `SqlResolver`, `SqlSchema`, or `SqlModel` when it fits
2. typed query literals plus Schema decoding when the query is local
3. only use manual row mapping when the first two options are clearly heavier than the problem

## Migrations

Use `Migrator` for migrations.

Repo reference:

- `./.repos/effect/packages/effect/src/unstable/sql/Migrator.ts`

The repo shows these best practices:

- maintain a dedicated migrations table
- load migrations through a managed loader
- run migrations through the Effect runtime
- keep migration execution observable with logs and spans
- use SQL client transaction and locking semantics handled by the migrator

Important behavior in the vendored repo:

- migrations table creation is dialect-aware
- duplicate migration IDs are detected
- concurrent migration runs are guarded
- each migration is logged and wrapped in a span

### Concrete Migration Loader Example

The runtime-specific SQL migrator packages expose `fromRecord(...)` to define migrations from an ordered record.

Example shape:

```ts
import * as SqliteMigrator from "@effect/sql-sqlite-bun/SqliteMigrator"
import * as Effect from "effect/Effect"

const migrations = SqliteMigrator.fromRecord({
  "1_create_todos": Effect.gen(function*() {
    yield* sql`
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      )
    `.withoutTransform
  }),
  "2_add_todo_index": Effect.gen(function*() {
    yield* sql`
      CREATE INDEX todos_completed_idx ON todos (completed)
    `.withoutTransform
  })
})
```

This matches the model used by the vendored migrator implementation:

- each migration has a numeric prefix and descriptive name
- each migration resolves to an `Effect`
- migrations are ordered by ID

### Running Migrations Directly

Use the runtime-specific `run(...)` helper when you want a startup effect that runs migrations explicitly.

Example shape:

```ts
import * as SqliteMigrator from "@effect/sql-sqlite-bun/SqliteMigrator"

const runMigrations = SqliteMigrator.run({
  loader: migrations
})
```

This is a good fit when:

- startup explicitly runs migrations before launching the main app
- deployment tooling runs migrations as a separate command
- you want migration results as an ordinary `Effect`

The return value includes the applied migration IDs and names.

### Running Migrations As A Layer

Use the runtime-specific `layer(...)` helper when migrations should run as part of top-level infrastructure setup.

Example shape:

```ts
import * as SqliteMigrator from "@effect/sql-sqlite-bun/SqliteMigrator"

const MigrationLayer = SqliteMigrator.layer({
  loader: migrations
})
```

From the vendored packages, this is implemented as `Layer.effectDiscard(run(options))`.

That means:

- the layer performs the migration effect
- it does not provide a new service of its own
- it is intended to be composed into startup infrastructure

### Concrete Startup Composition Example

Preferred shape:

```ts
const SqlLayer = SqliteClient.layer({ filename: "todos.sqlite" })

const MigrationLayer = SqliteMigrator.layer({
  loader: migrations
})

const MigratedSqlLayer = Layer.merge(
  SqlLayer,
  MigrationLayer.pipe(Layer.provide(SqlLayer))
)
```

This keeps the structure explicit:

- one layer provides the SQL client
- one layer runs migrations
- the merged layer represents a migrated SQL environment

If the same migrated SQL environment is reused in tests, create it once and reuse the layer value.

### Migration Best Practices

- use stable numeric migration IDs
- keep migration files ordered and unique
- do not hand-roll a separate migrations subsystem if `Migrator` already fits the project
- keep migration execution at startup or a dedicated operational boundary
- do not bury migration execution inside arbitrary service construction unless startup is explicitly the right place

### Preferred Migration Boundary

Good pattern:

- construct the SQL layer
- run migrations once at startup or deployment entry
- then run the main application

Concrete shapes:

- separate startup effect: `SqliteMigrator.run({ loader })`
- startup layer: `SqliteMigrator.layer({ loader })`
- migrated environment layer: merge the SQL client layer with the migration layer provided by that client layer

Avoid:

- opportunistic migrations inside ordinary request handlers
- schema creation hidden inside unrelated business service constructors

## Errors

Prefer SQL errors that stay inside the Effect SQL model as long as possible.

Use domain-level translation only where it helps the business boundary.

Good:

- SQL layer or repository works with `SqlError` and schema decode failures where appropriate
- higher-level service translates expected cases into domain errors when needed

Avoid:

- converting every SQL error immediately into a string
- hiding SQL failure details too early

## Observability

The vendored SQL modules already integrate with spans and transaction context.

This is another reason to prefer them over raw driver usage.

Good pattern:

- use `SqlClient` and `withTransaction`
- keep business operations wrapped with `Effect.fn`
- add explicit spans only where business-level detail matters beyond the built-in SQL spans

## Layering Pattern

Preferred layering shape:

1. runtime-specific database layer provides `SqlClient`
2. migrations run at startup boundary
3. domain repository/service depends on `SqlClient`
4. top-level application layer composes the database layer with the business layers

This keeps:

- driver choice at the edge
- SQL capability in the middle
- business logic above it

## Anti-Patterns

- embedding a native driver directly in business services when Effect SQL modules are available
- hand-rolling transactions with raw SQL statements in service methods
- hiding schema creation inside unrelated service constructors
- exporting one trivial accessor function per repository/service method
- converting SQL errors to strings too early
- bypassing `Migrator` when the project already uses Effect SQL
- creating ad hoc migration effects without a stable loader shape when `fromRecord(...)` already fits the project
- scattering migration execution across multiple subsystems instead of one explicit startup boundary

## Good Repo Examples To Study

- `./.repos/effect/packages/effect/src/unstable/sql/SqlClient.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/Migrator.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlResolver.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlSchema.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlModel.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`
