# Error Handling Guide

This guide is based on the vendored Effect source in `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/effect/src/Data.ts`
- `./.repos/effect/packages/effect/src/Schema.ts`
- `./.repos/effect/packages/effect/src/Cause.ts`
- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`

## Mental Model

Effect distinguishes three failure modes:

- failure: expected, typed errors in the `E` channel of `Effect<A, E, R>`
- defect: unexpected unchecked failures, represented as `Cause.Die`
- interrupt: cooperative cancellation, represented as `Cause.Interrupt`

This distinction is explicit in `Cause`.

Repo references:

- `./.repos/effect/packages/effect/src/Cause.ts`
- `./.repos/effect/packages/effect/src/Effect.ts`

## Preferred Error Definition Styles

Preference order:

1. use schema-based errors when possible
2. fall back to `Data.TaggedError` only when the error payload is not meaningfully serializable or schema-shaped

Schema-based errors are strictly more powerful because they give you:

- typed yieldable errors
- schema-defined fields
- encode/decode support
- better protocol and boundary interoperability
- stronger documentation and tooling hooks

### 1. `Schema.TaggedErrorClass` for schema-backed tagged errors

Use `Schema.TaggedErrorClass` by default when the error can be described with schemas.

Why:

- it creates a yieldable tagged error
- fields are defined with `Schema`
- the error shape can participate in schema-based tooling and encode/decode flows

Repo references:

- `./.repos/effect/packages/effect/src/Schema.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`

Example:

```ts
import { Effect, Schema } from "effect"

class InvalidPayload extends Schema.TaggedErrorClass<InvalidPayload>()(
  "InvalidPayload",
  {
    field: Schema.String,
    reason: Schema.String
  }
) {}

const validate = Effect.fail(
  InvalidPayload.make({
    field: "email",
    reason: "missing"
  })
)
```

Use this when:

- the error is part of a protocol or transport boundary
- the error needs a precise schema representation
- the error should be serializable or documented structurally

This is also a good default for domain errors when their payload is schema-friendly.

### 2. `Schema.ErrorClass` for schema-backed errors without `_tag` routing

Use `Schema.ErrorClass` when you want schema-defined error objects but do not specifically need tag-based pattern matching.

Repo references:

- `./.repos/effect/packages/effect/src/Schema.ts`
- examples across `./.repos/effect/packages/effect/src/unstable/*`

Example shape from the vendored repo:

- `./.repos/effect/packages/effect/src/unstable/httpapi/HttpApiError.ts`
- `./.repos/effect/packages/effect/src/unstable/workers/WorkerError.ts`

### 3. `Data.TaggedError` for non-serializable or lightweight domain errors

Use `Data.TaggedError` when schema-based errors are not a good fit.

This is mainly the fallback for:

- non-serializable payloads
- ad hoc in-memory-only errors
- cases where schema shape would be artificial or misleading

Repo reference:

- `./.repos/effect/packages/effect/src/Data.ts`

Example:

```ts
import { Data, Effect } from "effect"

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly userId: string
}> {}

const loadUser = (userId: string) =>
  Effect.fail(new UserNotFound({ userId }))

const program = Effect.gen(function*() {
  yield* loadUser("u_123")
})
```

## When To Prefer `Data.TaggedError` vs `Schema.TaggedErrorClass`

Prefer `Schema.TaggedErrorClass` when:

- the error can be expressed as a schema
- the error payload must be described by schemas
- the error crosses process, protocol, persistence, or serialization boundaries
- you want the error type to participate in schema tooling

Prefer `Data.TaggedError` when:

- the payload is not meaningfully serializable
- the payload cannot reasonably be modeled as a schema
- the error is intentionally local and in-memory only

## Schema-Based Error Workflows

### Boundary validation should fail with `SchemaError`

When validating external input, Effect's schema APIs return `SchemaError` in the error channel.

Repo references:

- `./.repos/effect/packages/effect/src/Schema.ts`
- `Schema.decodeUnknownEffect`
- `Schema.decodeUnknownExit`
- `Schema.encodeUnknownEffect`

Example:

```ts
import { Effect, Schema } from "effect"

const UserPayload = Schema.Struct({
  id: Schema.String,
  email: Schema.String
})

const decodeUser = Schema.decodeUnknownEffect(UserPayload)
```

This gives you:

- success: validated typed data
- failure: `Schema.SchemaError`

### Normalize `SchemaError` at the boundary

For application code, it is often better to convert `SchemaError` into a domain error near the boundary.

Example:

```ts
import { Data, Effect, Schema } from "effect"

class InvalidRequestBody extends Data.TaggedError("InvalidRequestBody")<{
  readonly message: string
}> {}

const UserPayload = Schema.Struct({
  id: Schema.String,
  email: Schema.String
})

const decodeUser = (input: unknown) =>
  Schema.decodeUnknownEffect(UserPayload)(input).pipe(
    Effect.catchTag("SchemaError", (error) =>
      Effect.fail(new InvalidRequestBody({ message: error.message }))
    )
  )
```

Why:

- transport validation stays close to the transport layer
- the rest of the application can work with domain-specific errors

### Use schema-backed errors for protocol errors

The vendored repo uses schema-backed errors in places like SQL, RPC, sockets, and HTTP APIs.

Strong examples:

- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`
- `./.repos/effect/packages/effect/src/unstable/socket/Socket.ts`
- `./.repos/effect/packages/effect/src/unstable/eventlog/EventLogMessage.ts`

These are good reference points when the error contract matters externally.

## Wrapping Foreign Or Generic Errors

When an error comes from a library, runtime API, or generic `Error`, prefer wrapping it in a typed error instead of leaking the foreign error directly through your domain or protocol boundary.

This is a very common pattern in the vendored repo.

Good examples:

- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`
- `./.repos/effect/packages/effect/src/unstable/rpc/RpcClientError.ts`
- `./.repos/effect/packages/effect/src/unstable/socket/Socket.ts`
- `./.repos/effect/packages/effect/src/unstable/workers/WorkerError.ts`
- `./.repos/effect/packages/effect/src/unstable/persistence/Redis.ts`

### Preferred Pattern

Wrap the foreign error in a schema-backed typed error and preserve the original error in a `cause` field.

Prefer using:

- `Schema.Defect` when you want to preserve a generic encoded defect
- `Schema.DefectWithStack` when the stack should be preserved in the schema contract

Example:

```ts
import { Effect, Schema } from "effect"

class TodoStorageError extends Schema.TaggedErrorClass<TodoStorageError>()(
  "TodoStorageError",
  {
    operation: Schema.String,
    cause: Schema.Defect
  }
) {}

const makeStorageError = (operation: string) => (cause: unknown) =>
  TodoStorageError.make({
    operation,
    cause
  })

const loadTodo = (id: number) =>
  Effect.try({
    try: () => someLibraryCall(id),
    catch: makeStorageError("loadTodo")
  })
```

When stack preservation matters in the encoded schema, prefer:

```ts
class WorkerFailure extends Schema.TaggedErrorClass<WorkerFailure>()(
  "WorkerFailure",
  {
    cause: Schema.DefectWithStack
  }
) {}
```

### Why This Is Preferred

- the application still exposes a typed error contract
- the original foreign failure is preserved for diagnostics
- schema-aware transports can encode and decode the failure shape
- business code does not become coupled to a raw library error type

### When To Use This Pattern

Use it when:

- a third-party library throws or rejects with `Error`
- a runtime API returns generic failures
- a lower-level subsystem failure should be surfaced through a typed domain or protocol error
- you need to preserve the underlying failure for debugging without leaking the foreign type as the public error contract

### `Schema.Defect` vs `Schema.DefectWithStack`

Prefer `Schema.Defect` by default.

Use `Schema.DefectWithStack` when:

- stack information is part of the intended encoded error contract
- the error is primarily infrastructural or diagnostic
- the downstream consumer benefits from the preserved stack

### Avoid This Anti-Pattern

Avoid exposing raw generic errors directly as the application error contract.

Bad:

```ts
const loadTodo = (id: number) =>
  Effect.try({
    try: () => someLibraryCall(id),
    catch: (cause) => cause as Error
  })
```

Why this is bad:

- the error channel loses a stable typed contract
- the code depends on unsafe assertions
- transport and schema integration become weaker
- callers must understand foreign error shapes instead of your own typed error model

## Handling Failures

### Handle specific tagged errors with `Effect.catchTag`

Use `catchTag` when your error type has `_tag` and you want focused recovery.

Repo reference:

- `./.repos/effect/packages/effect/src/Effect.ts`

Example:

```ts
const recovered = program.pipe(
  Effect.catchTag("UserNotFound", (error) =>
    Effect.succeed({ id: error.userId, guest: true })
  )
)
```

### Handle several tagged errors with `Effect.catchTags`

Use `catchTags` when multiple domain errors should be handled together.

```ts
const recovered = program.pipe(
  Effect.catchTags({
    UserNotFound: () => Effect.succeed(null),
    InvalidPayload: (error) => Effect.succeed({ error: error.reason })
  })
)
```

### Handle predicate-based subsets with `Effect.catchIf`

Use `catchIf` when matching on a predicate or refinement, not just `_tag`.

### Turn failure into a value with `Effect.match`

Use `match` when you want to fully fold the typed error channel into a success value.

```ts
const outcome = program.pipe(
  Effect.match({
    onFailure: (error) => ({ ok: false as const, error }),
    onSuccess: (value) => ({ ok: true as const, value })
  })
)
```

## Handling Defects

Defects are not normal domain failures.

They come from:

- `Effect.die`
- unchecked exceptions in effectful code
- invariants that were broken

Repo references:

- `./.repos/effect/packages/effect/src/Cause.ts`
- `./.repos/effect/packages/effect/src/Effect.ts`

### Preferred rule

Do not model expected business failures as defects.

Use defects for:

- impossible states
- programmer errors
- unrecoverable infrastructure corruption

### Inspect defects with `sandbox`, `catchCause`, or `matchCause`

Use `sandbox` to expose `Cause<E>` in the error channel.

```ts
import { Cause, Effect } from "effect"

const diagnosed = program.pipe(
  Effect.sandbox,
  Effect.catchCause((cause) => {
    if (Cause.hasDies(cause)) {
      return Effect.succeed("defect")
    }
    return Effect.failCause(cause)
  })
)
```

Use `matchCause` or `matchCauseEffect` when you need to distinguish:

- typed failures
- defects
- interrupts

### Boundary-only recovery for defects

If you recover from defects at all, do it only at clear boundaries.

Examples:

- worker or RPC boundary
- CLI top-level runner
- HTTP server adapter

Typical pattern:

- log or report defect details
- translate to a safe external error
- avoid continuing as if it were a normal domain failure

### `Effect.orDie`

Use `orDie` when an error channel should be treated as unrecoverable from this point onward.

That is appropriate when:

- a failure has already been validated elsewhere as impossible
- continuing with typed recovery would only obscure a broken invariant

Do not use `orDie` just to silence a type you do not want to handle.

## Handling Interrupts

Interrupts are cancellation, not business failure.

Repo references:

- `./.repos/effect/packages/effect/src/Cause.ts`
- `./.repos/effect/packages/effect/src/Effect.ts`

### Use `Effect.interrupt` to stop work cooperatively

Interrupts signal that the fiber should stop. They should not usually be translated into a domain error.

### Use `Effect.onInterrupt` for cleanup

If interrupted work needs special cleanup, use `onInterrupt`.

```ts
import { Console, Effect } from "effect"

const program = longRunningTask.pipe(
  Effect.onInterrupt(() => Console.log("cleaning up after interrupt"))
)
```

### Use `Cause` inspection when interrupts must be distinguished

When handling full causes, use `Cause.isInterruptReason`, `Cause.hasInterrupts`, or filtering over `cause.reasons`.

This is useful for:

- deciding whether to suppress logs for normal cancellation
- keeping retries for failure but not for cancellation
- distinguishing timeout/cancel flows from real errors

### Do not treat interrupts as ordinary failures

Avoid patterns that collapse all causes into a single error value too early. Interrupts often need different operational behavior.

## Recommended Patterns

### Pattern: domain errors inside the app, schema errors at the edge

- decode external input with `Schema.decodeUnknownEffect`
- convert `SchemaError` into a domain or transport error near the boundary
- keep the rest of the application on domain errors

### Pattern: tagged errors for recovery

- define domain failures with `Data.TaggedError`
- recover with `catchTag` or `catchTags`
- keep `_tag` names stable and descriptive

### Pattern: schema-backed errors for protocols

- use `Schema.TaggedErrorClass` or `Schema.ErrorClass` when the error contract itself matters
- follow examples in SQL, socket, RPC, and HTTP modules

### Pattern: only inspect `Cause` when you really need the full failure structure

Use `catchCause`, `matchCause`, or `sandbox` when you must distinguish:

- expected failures
- defects
- interrupts

Otherwise prefer the simpler typed error operators.

## Anti-Patterns

- using defects for expected validation or business-rule failures
- converting every error immediately to `unknown` or `string`
- using `orDie` to avoid proper handling of expected errors
- treating interrupts as ordinary business failures
- leaking `SchemaError` deep into domain code when it should be normalized at the boundary

## Good Repo Examples To Study

- `./.repos/effect/packages/effect/src/Data.ts`
- `./.repos/effect/packages/effect/src/Cause.ts`
- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/effect/src/Schema.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlError.ts`
- `./.repos/effect/packages/effect/src/unstable/http/HttpClientError.ts`
- `./.repos/effect/packages/effect/src/unstable/http/HttpServerError.ts`
- `./.repos/effect/packages/effect/src/unstable/socket/Socket.ts`
- `./.repos/effect/packages/effect/src/unstable/httpapi/HttpApiError.ts`
