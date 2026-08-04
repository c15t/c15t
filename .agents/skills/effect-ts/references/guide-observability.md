# Observability Guide

This guide is based on the vendored Effect source in `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/effect/src/Tracer.ts`
- `./.repos/effect/packages/effect/src/Logger.ts`
- `./.repos/effect/packages/effect/src/Metric.ts`
- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`
- `./.repos/effect/packages/opentelemetry/src/Tracer.ts`

## Mental Model

Observable Effect code should make business operations visible by default.

That means:

- business logic should show up clearly in stack traces
- important operations should produce spans
- logs should inherit execution context
- metrics should be attached at meaningful boundaries

The most important best practice is:

- prefer `Effect.fn(...)` whenever possible for business logic

Why:

- it adds stack frames
- it creates spans automatically
- it gives you better tracing and debugging for free
- it keeps business logic observable without extra boilerplate

Repo reference:

- `./.repos/effect/packages/effect/src/Effect.ts`

## Preferred Rule

Use `Effect.fn` as the default constructor for business-logic functions that return `Effect`.

Prefer this:

```ts
import { Effect } from "effect"

const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  return { id: userId, name: "Ada" }
})
```

Over this:

```ts
import { Effect } from "effect"

const loadUser = (userId: string) =>
  Effect.gen(function*() {
    return { id: userId, name: "Ada" }
  })
```

The second version works, but it throws away useful observability structure that `Effect.fn` gives you automatically.

## Prefer `Effect.fn` Over Raw `Effect.gen`

For business-logic definitions, prefer `Effect.fn` over writing raw `Effect.gen` directly, even when the operation takes no arguments.

Prefer this:

```ts
const refreshCache = Effect.fn("refreshCache")(function*() {
  yield* Effect.logInfo("refreshing cache")
})
```

Over this:

```ts
const refreshCache = Effect.gen(function*() {
  yield* Effect.logInfo("refreshing cache")
})
```

Why:

- `Effect.fn` gives the operation a clear observable identity
- stack traces are better
- tracing is more consistent
- the codebase gets a uniform shape for business operations

Use raw `Effect.gen` when necessary, for example:

- inline effect blocks inside another `Effect.fn`
- small one-off composition at call sites
- top-level assembly code where you are not defining a reusable business operation

Rule of thumb:

- reusable business operation: `Effect.fn`
- inline composition block: `Effect.gen`

## `Effect.fn` vs `Effect.fnUntraced`

### `Effect.fn`

Use `Effect.fn` for almost all business logic.

It is the preferred default because it adds:

- stack frames
- tracing spans
- optional post-processing of the produced effect

Example:

```ts
import { Effect } from "effect"

const createUser = Effect.fn("createUser")(function*(name: string) {
  return { id: "u_123", name }
})
```

Use this for:

- domain operations
- application services
- handlers
- workflows
- orchestrations
- repository calls

### `Effect.fnUntraced`

Use `Effect.fnUntraced` only for edge cases.

The vendored Effect repo itself uses `fnUntraced` in a number of low-level internals and integration helpers. That does not make it the default recommendation for downstream application or business code.

If you do not want an explicit named span, prefer `Effect.fn` without a span name so you still keep stack traces and the normal traced-function behavior.

Prefer this:

```ts
const normalizeUser = Effect.fn(function*(input: string) {
  return input.trim().toLowerCase()
})
```

Over this:

```ts
const normalizeUser = Effect.fnUntraced(function*(input: string) {
  return input.trim().toLowerCase()
})
```

Typical cases:

- extremely hot low-level internal helpers
- very small internal combinators
- tight loops where you have measured overhead and need to reduce it

Preferred rule:

- `Effect.fn` by default
- `Effect.fn` without a span name when you want to avoid an explicit named span
- `Effect.fnUntraced` only with a concrete measured reason

## Business Logic Patterns

### Pattern: one named `Effect.fn` per meaningful operation

Good:

```ts
const parseCommand = Effect.fn("parseCommand")(function*(input: string) {
  return input.trim()
})

const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  return { id: userId, name: "Ada" }
})

const sendWelcomeEmail = Effect.fn("sendWelcomeEmail")(function*(userId: string) {
  const user = yield* loadUser(userId)
  return user.email
})
```

Why this is good:

- each operation has a clear span name
- traces reflect business concepts
- stack traces reflect the actual workflow

### Pattern: use meaningful names

Span names created through `Effect.fn` should represent business operations, not generic implementation detail.

Prefer:

- `loadUser`
- `chargeInvoice`
- `syncGithubInstallation`

Avoid:

- `helper`
- `run`
- `process`
- `step1`

## Explicit Spans

### `Effect.withSpan`

Use `withSpan` when you need an explicit span around an effect that is not already naturally represented by a named `Effect.fn`, or when you want a nested sub-operation span.

Example:

```ts
import { Effect } from "effect"

const syncUser = Effect.fn("syncUser")(function*(userId: string) {
  const profile = yield* fetchProfile(userId).pipe(
    Effect.withSpan("fetchProfile")
  )

  return yield* persistProfile(profile).pipe(
    Effect.withSpan("persistProfile")
  )
})
```

Use this when:

- you want a nested span inside a larger operation
- you are instrumenting an existing effect pipeline
- you need more detailed trace structure than `Effect.fn` alone provides

### `Effect.withSpanScoped`

Use `withSpanScoped` when the span should remain open for the lifetime of a scope.

This is less common in business logic and more common in long-lived resource or streaming workflows.

### `Effect.withParentSpan`

Use `withParentSpan` when integrating with an externally created span or continuing a parent span manually.

This is useful in framework or interoperability boundaries.

## Span Enrichment

### `Effect.annotateCurrentSpan`

Use `annotateCurrentSpan` to attach important structured fields to the current span.

Example:

```ts
import { Effect } from "effect"

const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  yield* Effect.annotateCurrentSpan({ userId })
  return { id: userId, name: "Ada" }
})
```

Good span annotations:

- stable identifiers
- domain-relevant keys
- request or resource identifiers
- small structured values

Avoid:

- giant payloads
- secrets
- noisy transient data with little diagnostic value

## Logging Patterns

### Use Effect logging inside effects

Prefer:

- `Effect.log`
- `Effect.logInfo`
- `Effect.logDebug`
- `Effect.logWarning`
- `Effect.logError`

These integrate with the current Effect execution context.

Example:

```ts
const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  yield* Effect.logDebug("loading user", { userId })
  return { id: userId, name: "Ada" }
})
```

### `Effect.withLogSpan`

Use `withLogSpan` when you want log messages to carry a local logical span label even when you are not creating a full tracing span.

Example:

```ts
const program = Effect.logInfo("starting sync").pipe(
  Effect.withLogSpan("user-sync")
)
```

This is useful for:

- log grouping
- quick local context
- correlation in plain log output

### Logging Best Practices

- log at business boundaries, not every tiny helper
- prefer structured values over concatenated strings
- keep logs high-signal
- avoid duplicate logs at every layer of the stack
- rely on spans plus a few well-placed logs, not log spam

## Metrics Patterns

### Track effects at meaningful boundaries

Use metric tracking on meaningful operations such as:

- requests
- jobs
- retries
- external calls
- queue handlers

Repo reference:

- `./.repos/effect/packages/effect/src/Effect.ts`
- `Effect.track`

Example:

```ts
import { Effect, Metric } from "effect"

const requests = Metric.counter("user_load_requests").pipe(
  Metric.withConstantInput(1)
)

const loadUser = Effect.fn("loadUser")(
  function*(userId: string) {
    return { id: userId, name: "Ada" }
  },
  Effect.track(requests)
)
```

### Prefer boundary metrics over micro-metrics

Good metrics are usually attached to:

- endpoint handlers
- queue/job handlers
- repository operations
- external API boundaries

Avoid putting a metric on every tiny internal helper.

## OpenTelemetry Integration

For real application observability, compose telemetry at the layer level.

The vendored repo provides `@effect/opentelemetry` layers such as:

- `NodeSdk.layer`
- `Tracer.layer`
- `Logger.layer`
- `Metrics.layer`

Repo references:

- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`
- `./.repos/effect/packages/opentelemetry/src/Tracer.ts`

Preferred composition style:

```ts
const AppLayer = Layer.mergeAll(
  UserLayer,
  BillingLayer,
  HttpLayer
).pipe(
  Layer.provide(Telemetry),
  Layer.provide(NodeSdk)
)
```

Why:

- business code stays observability-agnostic
- observability is configured once at the boundary
- spans, logs, and metrics remain consistent across the app

## OpenTelemetry JS Framework Integration

The vendored repo includes a real integration layer for the OpenTelemetry JavaScript ecosystem in `@effect/opentelemetry`.

This is the preferred integration path when the application needs to participate in the standard OpenTelemetry JS framework, exporters, and SDKs.

Relevant modules:

- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`
- `./.repos/effect/packages/opentelemetry/src/Tracer.ts`
- `./.repos/effect/packages/opentelemetry/src/Metrics.ts`
- `./.repos/effect/packages/opentelemetry/src/Logger.ts`
- `./.repos/effect/packages/opentelemetry/src/Resource.ts`
- `./.repos/effect/packages/opentelemetry/src/WebSdk.ts`

### Preferred Integration Model

Use `@effect/opentelemetry` layers to bridge Effect observability into OpenTelemetry JS.

Do not manually wire OpenTelemetry SDK objects inside business code.

Prefer:

- configuring tracer, metrics, logger, and resource layers once
- composing them into the application layer graph
- keeping business code written against Effect tracing, logging, and metrics APIs

This means:

- application code should keep using `Effect.fn`, `Effect.withSpan`, `Effect.log*`, and Effect metrics
- OpenTelemetry JS should be introduced at the infrastructure layer, not inside domain operations

### `NodeSdk.layer`

`NodeSdk.layer(...)` is the main Node.js integration entrypoint.

From the vendored source, it accepts a configuration that can include:

- span processors
- tracer config
- metric readers
- temporality preference
- log record processors
- logger provider config
- resource information such as service name and version
- shutdown timeout

It then builds and merges:

- resource layer
- tracer layer
- metrics layer
- logger layer

This makes it the preferred high-level integration for Node applications.

### Resource Configuration

OpenTelemetry JS integration should define resource metadata explicitly.

From `NodeSdk.layer`, the supported resource configuration includes:

- `serviceName`
- `serviceVersion`
- additional attributes

This is important because tracer and logger setup depend on the configured resource.

Best practice:

- always provide a meaningful service name
- provide service version when available
- use resource attributes for stable deployment or environment metadata

### Tracing Integration

The `Tracer` module bridges Effect spans into OpenTelemetry spans.

Important integration points from the vendored source:

- `Tracer.layer`
- `Tracer.layerGlobal`
- `Tracer.layerGlobalProvider`
- `Tracer.currentOtelSpan`
- `Tracer.makeExternalSpan`

Use these when:

- you need Effect tracing to export through OpenTelemetry JS
- you need to continue or bridge external trace context
- you need access to the current OpenTelemetry span object

Best practice:

- keep creating spans with Effect APIs in application code
- use the OpenTelemetry tracer layer to export and bridge them
- use `makeExternalSpan` or parent-span wiring only at integration boundaries

### Metrics Integration

The `Metrics` module connects Effect metrics to OpenTelemetry JS metric readers.

Important details from the vendored implementation:

- `Metrics.layer(...)` registers a producer against one or more metric readers
- it supports temporality preferences:
  - `cumulative`
  - `delta`
- it handles shutdown through scoped layer cleanup

Best practice:

- choose temporality based on the backend
- configure metric readers in the telemetry layer
- keep application code focused on recording Effect metrics, not exporter mechanics

### Logger Integration

The `Logger` module connects Effect logging to OpenTelemetry JS logs.

Important details from the vendored implementation:

- it maps Effect log levels to OpenTelemetry severity numbers
- it includes fiber ID, span context, log annotations, and log span timing in emitted attributes
- `Logger.layer({ mergeWithExisting })` can merge with or replace existing application loggers

Best practice:

- prefer merging with existing loggers unless there is a strong reason to replace them
- use Effect log annotations and log spans so the OpenTelemetry logger receives structured context automatically

### Shutdown And Lifecycle

The vendored layers use scoped acquisition and release for tracer providers, metric readers, and logger providers.

This is the correct lifecycle model.

Do not manually call provider shutdown methods from arbitrary business logic.

Instead:

- let the OpenTelemetry layers own provider lifecycle
- compose them into the application layer graph
- let the runtime or outer layer scope manage shutdown

### External Trace Context

When integrating with frameworks or inbound protocols that already carry trace context, prefer using the OpenTelemetry integration helpers rather than hand-rolling context propagation.

The vendored tracer module provides:

- `makeExternalSpan`
- `currentOtelSpan`

Use these only at integration boundaries such as:

- HTTP adapters
- RPC adapters
- worker or queue adapters

Keep business operations oblivious to propagation mechanics.

### Recommended Pattern

Preferred architecture:

1. business code uses Effect observability APIs
2. infrastructure composes `@effect/opentelemetry` layers
3. the final app layer provides telemetry once at the top level

Example shape:

```ts
const TelemetryLayer = NodeSdk.layer(() => ({
  resource: {
    serviceName: "todo-service",
    serviceVersion: "1.0.0"
  },
  spanProcessor: mySpanProcessor,
  metricReader: myMetricReader,
  logRecordProcessor: myLogProcessor
}))

const AppLayer = Layer.mergeAll(
  DomainLayer,
  HttpLayer
).pipe(
  Layer.provide(TelemetryLayer)
)
```

This keeps:

- app code portable
- OTel JS setup centralized
- shutdown semantics correct
- exported spans, logs, and metrics aligned

### Anti-Patterns

- constructing OpenTelemetry SDK clients directly inside business services
- mixing manual exporter setup into domain code
- bypassing Effect logging and tracing APIs in normal business operations
- scattering provider shutdown logic across the application
- configuring telemetry separately in many subsystems instead of one top-level layer

## Anti-Patterns

### Anti-Pattern: business logic built from anonymous `Effect.gen` functions everywhere

Bad:

```ts
const loadUser = (userId: string) =>
  Effect.gen(function*() {
    return { id: userId, name: "Ada" }
  })
```

Why this is bad:

- weaker tracing structure
- poorer stack traces
- less consistent naming in debugging output

Preferred:

```ts
const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  return { id: userId, name: "Ada" }
})
```

### Anti-Pattern: using `Effect.fnUntraced` by default

This throws away free observability.

If you just do not want an explicit span name, use `Effect.fn` without a name instead.

Only use `fnUntraced` when you have a specific low-level reason.

### Anti-Pattern: logging without structure or context

Bad:

- giant interpolated strings
- duplicate logs at every layer
- logs with no business identifiers

Prefer:

- named operations via `Effect.fn`
- structured logs with IDs and context
- a few high-value logs at operation boundaries

### Anti-Pattern: hand-instrumenting every helper with spans

Do not create explicit spans everywhere just because you can.

Preferred order:

1. start with `Effect.fn`
2. add `Effect.withSpan` only where extra detail is actually useful
3. add metrics at meaningful boundaries

## Recommended Patterns

### Pattern: observable business operation

```ts
import { Effect } from "effect"

const fetchUser = Effect.fn("fetchUser")(function*(userId: string) {
  yield* Effect.annotateCurrentSpan({ userId })
  yield* Effect.logDebug("fetching user", { userId })
  return { id: userId, name: "Ada" }
})
```

### Pattern: orchestration with nested spans

```ts
const syncUser = Effect.fn("syncUser")(function*(userId: string) {
  const profile = yield* fetchRemoteProfile(userId).pipe(
    Effect.withSpan("fetchRemoteProfile")
  )

  return yield* persistProfile(profile).pipe(
    Effect.withSpan("persistProfile")
  )
})
```

### Pattern: framework boundary with runtime

```ts
const runtime = ManagedRuntime.make(AppLayer)

const handleRequest = (userId: string) =>
  runtime.runPromise(fetchUser(userId))
```

## Good Repo Examples To Study

- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/effect/src/Tracer.ts`
- `./.repos/effect/packages/effect/src/Logger.ts`
- `./.repos/effect/packages/effect/src/Metric.ts`
- `./.repos/effect/packages/opentelemetry/src/NodeSdk.ts`
- `./.repos/effect/packages/opentelemetry/src/Tracer.ts`
