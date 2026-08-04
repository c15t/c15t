# Effect Guide

This guide is based on common usage patterns in the vendored repo at `./.repos/effect`.

Key source areas:

- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/tools/`
- `./.repos/effect/packages/platform-*`
- `./.repos/effect/packages/opentelemetry/`
- `./.repos/effect/packages/vitest/`

## Mental Model

`Effect<A, E, R>` is the default way to represent application work.

It describes a computation that:

- succeeds with `A`
- fails with `E`
- requires services `R`

The repo consistently uses `Effect` as the main abstraction for:

- business workflows
- service methods
- platform integrations
- resource lifecycles
- tests

## Most Common Patterns In The Repo

The dominant usage pattern is:

1. use `Effect.gen` for workflows and orchestration
2. use `Effect.fn` for reusable effectful functions
3. use precise constructors such as `succeed`, `fail`, `sync`, `try`, and `tryPromise`
4. use `map`, `flatMap`, and `tap` for local transformations
5. access services in implementations and `provide*` only at edges
6. use `acquireRelease` and `scoped` for owned resources
7. use `catchTag` and `match` for typed recovery
8. use `run*` only at runtime boundaries

## Prefer `Effect.fn` For Reusable Operations

For reusable effectful operations, prefer `Effect.fn`.

```ts
import { Effect } from "effect"

const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  return { id: userId, name: "Ada" }
})
```

Use `Effect.fn` when:

- the operation is reusable
- the operation takes parameters
- the operation is part of business logic or a module API
- you want consistent tracing and stack frames

Do not treat `Effect.fnUntraced` as the default. If you do not want an explicit named span, use `Effect.fn` without a span name.

Repo examples:

- `./.repos/effect/packages/tools/utils/src/Codegen.ts`
- `./.repos/effect/packages/tools/openapi-generator/src/OpenApiPatch.ts`

## Use `Effect.gen` For Workflows

Use `Effect.gen` for orchestration and sequential workflows, especially when there are multiple `yield*` steps.

```ts
const program = Effect.gen(function*() {
  const config = yield* Config
  const repo = yield* UserRepo
  const user = yield* repo.getById("u_123")
  return { config, user }
})
```

Use `Effect.gen` when:

- the body is a workflow
- you are reading multiple services
- you have branching or multiple sequential steps
- you are implementing a layer, handler, or orchestration

Repo examples:

- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`
- `./.repos/effect/packages/tools/openapi-generator/src/OpenApiGenerator.ts`

## `Effect.fn` vs `Effect.gen`

Use this rule:

- reusable operation: `Effect.fn`
- inline workflow block: `Effect.gen`

Good split:

```ts
const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  const repo = yield* UserRepo
  return yield* repo.getById(userId)
})

const program = Effect.gen(function*() {
  const user = yield* loadUser("u_123")
  yield* Effect.logInfo("loaded user", user)
})
```

## `Effect.fnUntraced` Is An Escape Hatch

For application and business code, `Effect.fnUntraced` is not the default.

Use it only when:

- the function is an internal low-level helper
- observability is intentionally being traded away
- there is a concrete performance or tracing reason

If the only goal is to avoid an explicit named span, prefer:

```ts
const normalizeUser = Effect.fn(function*(input: string) {
  return input.trim().toLowerCase()
})
```

Instead of:

```ts
const normalizeUser = Effect.fnUntraced(function*(input: string) {
  return input.trim().toLowerCase()
})
```

## Constructor Functions

The repo uses constructor functions very deliberately.

### `Effect.succeed`

Use for pure successful values.

```ts
const ok = Effect.succeed(42)
```

### `Effect.fail`

Use for expected typed failures.

```ts
const notFound = Effect.fail(UserNotFound.make({ userId: "u_123" }))
```

### `Effect.sync`

Use for synchronous side effects or pure synchronous construction that should live inside `Effect`.

```ts
const buildConfig = Effect.sync(() => ({ retries: 3 }))
```

### `Effect.try`

Use for synchronous code that may throw.

```ts
import { Effect, Schema } from "effect"

class ParseError extends Schema.TaggedErrorClass<ParseError>()("ParseError", {
  cause: Schema.Defect
}) {}

const parseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (cause) => ParseError.make({ cause })
  })
```

### `Effect.tryPromise`

Use for Promise-returning APIs.

```ts
import { Effect, Schema } from "effect"

class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {
  cause: Schema.Defect
}) {}

const fetchText = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(url).then((response) => response.text()),
    catch: (cause) => FetchError.make({ cause })
  })
```

Preferred rule:

- pure value: `succeed`
- expected failure: `fail`
- synchronous non-throwing effect: `sync`
- synchronous throwing boundary: `try`
- Promise boundary: `tryPromise`

## Local Composition

The repo uses `map`, `flatMap`, and `tap` constantly for small local transformations.

### `Effect.map`

Use to transform successful values.

```ts
const userName = loadUser("u_123").pipe(
  Effect.map((user) => user.name)
)
```

### `Effect.flatMap`

Use when the next step returns another `Effect`.

```ts
const result = loadUser("u_123").pipe(
  Effect.flatMap((user) => saveAudit(user.id))
)
```

### `Effect.tap`

Use for side effects that should preserve the main value.

```ts
const result = loadUser("u_123").pipe(
  Effect.tap((user) => Effect.logDebug("loaded user", { userId: user.id }))
)
```

Preferred rule:

- outer workflow: `Effect.gen`
- local transformation: `map`, `flatMap`, `tap`

## Services And Provisioning

Repo style is:

- access services in implementation code
- provide them at boundaries

### Access services in implementations

```ts
const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  const repo = yield* UserRepo
  return yield* repo.getById(userId)
})
```

or:

```ts
const loadUser = (userId: string) =>
  Effect.service(UserRepo).pipe(
    Effect.flatMap((repo) => repo.getById(userId))
  )
```

### Provide at the edge

```ts
const program = loadUser("u_123").pipe(
  Effect.provide(AppLayer)
)
```

Use `provideService` and `provideServiceEffect` for targeted overrides, especially in tests or framework boundaries.

Do not default to exporting thin accessor functions that just fetch a service and forward to one service method. Prefer real business operations or direct service usage within the owning workflow.

Repo examples:

- `./.repos/effect/packages/tools/utils/src/bin.ts`
- `./.repos/effect/packages/tools/openapi-generator/test/`

## Error Handling

Common repo patterns:

- `catchTag` for expected tagged errors
- `match` for totalizing an effect into a value
- `catchCause` for full-cause infra handling

### `Effect.catchTag`

Use for targeted typed recovery.

```ts
const safe = loadUser("u_123").pipe(
  Effect.catchTag("UserNotFound", () => Effect.succeed(null))
)
```

### `Effect.match`

Use when the caller wants a value either way.

```ts
const result = loadUser("u_123").pipe(
  Effect.match({
    onFailure: () => null,
    onSuccess: (user) => user
  })
)
```

For deeper guidance, see `./references/guide-error-handling.md`.

## Resource Management

One of the strongest repo patterns is explicit resource ownership.

### `Effect.acquireRelease`

Use for resources that must be cleaned up.

```ts
const connection = Effect.acquireRelease(
  openConnection,
  (conn) => closeConnection(conn)
)
```

### `Effect.scoped`

Use when a workflow consumes scoped resources and should tie cleanup to scope lifetime.

```ts
const program = Effect.scoped(
  Effect.gen(function*() {
    const conn = yield* connection
    return yield* conn.query("select 1")
  })
)
```

Repo examples:

- `./.repos/effect/packages/platform-node/`
- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`

## SQL And Runtime Integrations

When Effect already provides a domain module for a capability, prefer that module over direct raw runtime client usage in business code.

Important example:

- prefer Effect SQL modules from `effect/unstable/sql/*` over embedding a native SQL driver directly in domain services

Why:

- transactions, spans, and typed errors stay inside the Effect model
- layering stays cleaner
- migrations and query conventions stay consistent

For SQL-specific guidance, see `./references/guide-sql.md`.

## Observability

The repo uses observability around meaningful boundaries, not every tiny helper.

Common patterns:

- `Effect.fn` for named operations
- `Effect.withSpan` for nested span boundaries
- `Effect.log*` for operational events
- `Effect.track` for metrics

For detailed guidance, see `./references/guide-observability.md`.

## Runtime Boundaries

The repo keeps `run*` APIs at true runtime boundaries.

### `Effect.runPromise`

Use when leaving Effect world into Promise-based hosts.

### `Effect.runFork`

Use for background fibers or long-running integration hooks.

### `Effect.runSync`

Use sparingly, mostly in specialized internals where synchrony is guaranteed.

Preferred rule:

- library/business code should return `Effect`
- entrypoints and integration boundaries should run `Effect`

If you have multiple external entrypoints, prefer `ManagedRuntime`.

## Commonly Used Effect APIs In This Repo

These are the most practically important `Effect` functions to know first:

- `Effect.fn`
- `Effect.gen`
- `Effect.succeed`
- `Effect.fail`
- `Effect.sync`
- `Effect.try`
- `Effect.tryPromise`
- `Effect.map`
- `Effect.flatMap`
- `Effect.tap`
- `Effect.service`
- `Effect.provide`
- `Effect.provideService`
- `Effect.catchTag`
- `Effect.match`
- `Effect.acquireRelease`
- `Effect.scoped`
- `Effect.withSpan`
- `Effect.logInfo`
- `Effect.logDebug`
- `Effect.runPromise`

## Good Repo Examples To Study

- `./.repos/effect/packages/tools/utils/src/Codegen.ts`
- `./.repos/effect/packages/tools/openapi-generator/src/OpenApiPatch.ts`
- `./.repos/effect/packages/tools/openapi-generator/src/OpenApiGenerator.ts`
- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`
- `./.repos/effect/packages/opentelemetry/src/Tracer.ts`
- `./.repos/effect/packages/platform-node/`
- `./.repos/effect/packages/vitest/src/index.ts`
