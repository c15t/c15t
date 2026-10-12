# Layers Guide

This guide is based on the vendored Effect source in `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/effect/src/Context.ts`
- `./.repos/effect/packages/effect/src/Layer.ts`
- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/effect/src/ManagedRuntime.ts`

## Mental Model

A service is a typed dependency.

A layer is a recipe for building one or more services, possibly using other services as dependencies.

Effect's model is:

- define service identifiers with `Context.Service` or `Context.Service(...)`
- require services from effects with `Effect.service` or by yielding the service key directly
- build implementations with `Layer`
- provide layers at the program boundary or subsystem boundary

`Layer<ROut, E, RIn>` means:

- `ROut`: services produced by the layer
- `E`: possible failures while constructing the layer
- `RIn`: dependencies required to build it

Repo references:

- `./.repos/effect/packages/effect/src/Context.ts`
- `./.repos/effect/packages/effect/src/Layer.ts`

## Services

## What A Service Is

A service is a typed key plus its implementation shape.

In Effect, services are values in `Context`, not global singletons.

This gives you:

- explicit dependencies
- easy substitution in tests
- layer-based composition
- multiple implementations for the same interface

## Preferred Service Definition Style

Prefer the class syntax with `Context.Service`.

This matches the vendored repo's current style.

There are two good definition styles:

- explicit service shape in the `Context.Service<...>` generic
- inferred service shape from the `make` argument

Example:

```ts
import { Context, Effect, Schema } from "effect"

class UserRepoError extends Schema.TaggedErrorClass<UserRepoError>()(
  "UserRepoError",
  {
    message: Schema.String
  }
) {}

class UserRepo extends Context.Service<UserRepo, {
  readonly getById: (id: string) => Effect.Effect<{ id: string; name: string }, UserRepoError>
}>()("UserRepo") {}
```

Why this style is preferred:

- the service identifier and shape live in one place
- it works naturally with `yield* UserRepo`
- it matches the patterns used across `.repos/effect`

Repo reference:

- `./.repos/effect/packages/effect/src/Context.ts`

## Service Shape Inference With `make`

When the implementation shape is clearer than the interface declaration, prefer using the `make` argument so the service shape is inferred from the implementation.

```ts
import { Context, Effect, Schema } from "effect"

class UserRepoError extends Schema.TaggedErrorClass<UserRepoError>()(
  "UserRepoError",
  {
    message: Schema.String
  }
) {}

class UserRepo extends Context.Service<UserRepo>()("UserRepo", {
  make: Effect.succeed({
    getById: Effect.fn("UserRepo.getById")(function*(id: string) {
      return yield* Effect.fail(
        UserRepoError.make({ message: `User ${id} not found` })
      )
    })
  })
}) {}
```

Why this style is useful:

- the implementation and inferred API stay together
- TypeScript derives the service shape automatically
- it avoids repeating the same method signatures twice

Prefer this style when:

- the implementation is small and obvious
- the explicit service shape would only duplicate the implementation

Prefer the explicit generic shape when:

- you want the contract stated before the implementation
- the API surface should be emphasized separately from the implementation

## Service Example

```ts
import { Context, Effect, Schema } from "effect"

class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()(
  "UserNotFound",
  {
    userId: Schema.String
  }
) {}

class UserRepo extends Context.Service<UserRepo, {
  readonly getById: (id: string) => Effect.Effect<{ id: string; name: string }, UserNotFound>
}>()("UserRepo") {}

const loadUser = (userId: string) =>
  Effect.gen(function*() {
    const repo = yield* UserRepo
    return yield* repo.getById(userId)
  })
```

Key points:

- `UserRepo` is both the identifier and a value you can yield from `Effect.gen`
- the implementation shape is explicit in the service definition
- the effect that uses it stays abstract over the implementation

## When To Use `Context.Reference`

Use `Context.Reference` for contextual values with defaults, not for full service APIs.

Good use cases:

- current configuration knobs
- current request metadata
- feature flags or tracing flags with defaults

Repo reference:

- `./.repos/effect/packages/effect/src/Context.ts`

Use a full service instead when:

- behavior matters more than data
- you need multiple methods
- you want a concrete test double or alternate implementation

## Accessing Services

Common patterns:

```ts
const program = Effect.gen(function*() {
  const repo = yield* UserRepo
  return yield* repo.getById("u_123")
})
```

or:

```ts
const program = Effect.service(UserRepo).pipe(
  Effect.flatMap((repo) => repo.getById("u_123"))
)
```

Best practice:

- use `yield* Service` or `Effect.service(Service)` inside business logic
- do not manually thread service implementations through function arguments when they are real application dependencies

## Service Encapsulation

Prefer keeping service access inside the business operation that needs it rather than exporting thin accessor wrappers for every method.

Avoid this pattern:

```ts
export const createTodo = Effect.fn(function*(title: string) {
  const todos = yield* TodoService
  return yield* todos.create(title)
})
```

Why this is usually a bad pattern:

- it leaks the service dependency into a second public API layer
- it encourages a redundant accessor function per service method
- it spreads dependency access patterns across the codebase
- it weakens service encapsulation instead of improving it

Prefer one of these patterns instead:

1. Put the real business logic in a function that uses the service internally because it adds behavior beyond simple forwarding.
2. Expose the service itself and call its methods from the module that owns the workflow.
3. If you need a public operation, make it a real business operation, not a trivial alias of one service method.

Good:

```ts
export const completeTodo = Effect.fn("completeTodo")(function*(id: number) {
  const todos = yield* TodoService
  const todo = yield* todos.getById(id)
  if (todo.completed) {
    return todo
  }
  return yield* todos.setCompleted(id, true)
})
```

This is good because:

- the exported function represents a business operation
- the service remains an internal dependency of that operation
- the function adds behavior rather than just forwarding one method call

## Layers

## What A Layer Is

A layer constructs services from dependencies.

Use a layer when:

- service construction is effectful
- the service depends on other services
- the service owns resources that must be acquired and released safely
- you want composition and reuse across modules

## Preferred Layer Constructors

### `Layer.succeed`

Use for pure, already-constructed implementations.

```ts
const UserRepoTest = Layer.succeed(UserRepo)({
  getById: (id) => Effect.succeed({ id, name: "Test User" })
})
```

Use this when:

- construction is pure
- no dependencies are needed
- no scoped resources are involved

### `Layer.effect`

Use when constructing a service requires effects, other services, or scoped resource acquisition.

```ts
class Config extends Context.Service<Config, {
  readonly apiBaseUrl: string
}>()("Config") {}

const UserRepoLayer = Layer.effect(UserRepo)(
  Effect.gen(function*() {
    const config = yield* Config

    return {
      getById: (id) =>
        Effect.succeed({
          id,
          name: `Fetched from ${config.apiBaseUrl}`
        })
    }
  })
)
```

Use this when:

- construction is effectful
- construction depends on other services
- construction needs `Scope` and finalization
- you want typed construction failure

This is also the correct constructor for services that own resources with acquisition and release semantics. In this repo, `Layer.effect` replaces the old `Layer.scoped` API.

Typical examples:

- database pools
- sockets
- background worker processes
- long-lived subscriptions

### `Layer.effectDiscard`

Use `Layer.effectDiscard` for scoped startup effects that do not provide a service.

Good use cases:

- starting background fibers in a layer
- one-time scoped initialization side effects
- subsystem startup hooks

### `Layer.effectContext`

Use when one effect constructs a full `Context` containing multiple services.

This is useful for subsystem builders that provide several related services together.

## Layer Composition

These operators do different things. Do not treat them as interchangeable.

### Composition Cheat Sheet

- `Layer.mergeAll(a, b, ...)`: combine outputs of multiple layers
- `Layer.provide(target, dependencies)`: feed dependency outputs into `target` and keep only `target` outputs
- `Layer.provideMerge(target, dependencies)`: feed dependency outputs into `target` and keep both dependency outputs and target outputs
- `Layer.flatMap(layer, f)`: choose the next layer based on the built service value

### Example Services

```ts
import { Context, Effect, Layer } from "effect"

class Config extends Context.Service<Config, {
  readonly apiBaseUrl: string
}>()("Config") {}

class Logger extends Context.Service<Logger, {
  readonly log: (message: string) => Effect.Effect<void>
}>()("Logger") {}

class UserRepo extends Context.Service<UserRepo, {
  readonly getById: (id: string) => Effect.Effect<{ id: string; name: string }>
}>()("UserRepo") {}

const ConfigLayer = Layer.succeed(Config)({
  apiBaseUrl: "https://api.example.com"
})

const LoggerLayer = Layer.succeed(Logger)({
  log: (message) => Effect.sync(() => console.log(message))
})

const UserRepoLayer = Layer.effect(UserRepo)(
  Effect.gen(function*() {
    const config = yield* Config
    const logger = yield* Logger

    return {
      getById: (id) =>
        Effect.gen(function*() {
          yield* logger.log(`loading ${id} from ${config.apiBaseUrl}`)
          return { id, name: "Ada" }
        })
    }
  })
)
```

### `Layer.mergeAll`

Use `Layer.mergeAll` to combine outputs of independent layers.

```ts
const Dependencies = Layer.mergeAll(
  ConfigLayer,
  LoggerLayer
)
```

Use this when:

- the layers provide different services
- neither needs to transform the other directly

Semantics:

- inputs are combined
- outputs are combined
- no dependency feeding happens automatically

Important:

- `Layer.mergeAll(ConfigLayer, UserRepoLayer)` is wrong if `UserRepoLayer` requires `Config` and `Logger`
- `mergeAll` does not satisfy `UserRepoLayer`'s requirements
- it only places both layers side by side in the output graph

Correct pattern:

```ts
const Dependencies = Layer.mergeAll(
  ConfigLayer,
  LoggerLayer
)
```

### `Layer.provide`

Use `Layer.provide` to satisfy a target layer's dependencies with another layer, while keeping only the target layer's outputs.

```ts
const Dependencies = Layer.mergeAll(
  ConfigLayer,
  LoggerLayer
)

const UserRepoLayerReady = Layer.provide(UserRepoLayer, Dependencies)
```

Interpretation:

- `UserRepoLayer` requires `Config` and `Logger`
- `Dependencies` provides those dependencies
- the resulting layer provides only `UserRepo`
- `Config` and `Logger` are used for construction but are not kept in the final output

This is the operator to use when you want to hide construction dependencies behind a narrower public layer.

Example program:

```ts
const program = Effect.gen(function*() {
  const repo = yield* UserRepo
  return yield* repo.getById("u_123")
}).pipe(
  Effect.provide(UserRepoLayerReady)
)
```

### `Layer.provideMerge`

Use `provideMerge` when you want to satisfy dependencies and retain both the dependency outputs and the target outputs.

```ts
const Dependencies = Layer.mergeAll(
  ConfigLayer,
  LoggerLayer
)

const AppLayer = Layer.provideMerge(UserRepoLayer, Dependencies)
```

Interpretation:

- `UserRepoLayer` still gets `Config` and `Logger`
- the resulting layer provides `UserRepo`, `Config`, and `Logger`

This is useful for assembling larger application layers incrementally, especially when downstream code still needs access to the dependencies.

Example program:

```ts
const program = Effect.gen(function*() {
  const repo = yield* UserRepo
  const logger = yield* Logger

  const user = yield* repo.getById("u_123")
  yield* logger.log(user.name)
  return user
}).pipe(
  Effect.provide(AppLayer)
)
```

Preferred rule:

- use `provide` when you want to hide dependency details
- use `provideMerge` when you want to keep dependency services available downstream

### `Layer.mergeAll` vs `Layer.provide` vs `Layer.provideMerge`

Think of them like this:

- `mergeAll`: put layers next to each other
- `provide`: plug one layer into another, expose only the target
- `provideMerge`: plug one layer into another, expose both sides

### Composition Style Best Practice

Layers should almost always be fully composed locally before they are assembled into the final application layer.

Preferred style:

- define each service layer separately
- define local subsystem dependency bundles separately
- fully compose each subsystem locally with `Layer.provide` or `Layer.provideMerge`
- assemble the final application layer with `Layer.mergeAll(...)`
- apply top-level cross-cutting provisioning in a small number of explicit trailing steps

Good pattern:

```ts
const UserDependencies = Layer.mergeAll(
  ConfigLayer,
  LoggerLayer
)

const UserLayer = Layer.provide(UserRepoLayer, UserDependencies)

const BillingDependencies = Layer.mergeAll(
  ConfigLayer,
  LoggerLayer,
  DatabaseLayer
)

const BillingLayer = Layer.provide(BillingServiceLayer, BillingDependencies)

const AppLayer = Layer.mergeAll(
  UserLayer,
  BillingLayer,
  HttpLayer
).pipe(
  Layer.provide(Telemetry),
  Layer.provide(NodeSdk)
)
```

Why this style is preferred:

- subsystem wiring stays local to the subsystem
- the final application layer reads as a high-level composition map
- cross-cutting concerns such as telemetry stay visible at the top level
- it avoids deeply nested inline layer expressions

Avoid this style when a clearer local name would help:

```ts
const AppLayer = Layer.provide(
  Layer.mergeAll(
    Layer.provide(UserRepoLayer, Layer.mergeAll(ConfigLayer, LoggerLayer)),
    Layer.provide(BillingServiceLayer, Layer.mergeAll(ConfigLayer, LoggerLayer, DatabaseLayer)),
    HttpLayer
  ),
  Telemetry
).pipe(Layer.provide(NodeSdk))
```

That style is harder to read because:

- subsystem composition is hidden inside the final assembly
- shared dependencies are harder to spot
- it is harder to refactor or reuse subsystem layers

### `Layer.flatMap`

Use `flatMap` when the next layer depends on the actual constructed service value, not just its type-level requirement.

Example:

```ts
const UserRepoLayerFromConfig = Layer.flatMap(ConfigLayer, (config) =>
  Layer.succeed(UserRepo)({
    getById: (id) => Effect.succeed({ id, name: config.apiBaseUrl })
  })
)
```

This is more specialized than `merge` or `provide`.

Prefer simpler composition first:

- `merge` for combining
- `provide` for dependency satisfaction
- `flatMap` only when construction logic truly depends on the built value

## Providing Layers To Effects

## Preferred Rule

Provide layers at boundaries.

Usually that means:

- the application entrypoint
- a subsystem entrypoint
- a test boundary

Avoid repeatedly providing layers deep inside business logic unless you are deliberately isolating a subsystem.

### Anti-Pattern: Local `Effect.provide`

`Effect.provide` should be used only once at the entry of your program in normal application code.

Bad pattern:

```ts
const loadUser = (userId: string) =>
  Effect.gen(function*() {
    const repo = yield* UserRepo
    return yield* repo.getById(userId)
  }).pipe(
    Effect.provide(UserRepoLayer)
  )
```

Why this is an anti-pattern:

- it hides dependency wiring inside business logic
- it makes implementations harder to swap in tests
- it prevents clean top-level composition
- it encourages many small local runtimes instead of one coherent application graph
- it makes shared cross-cutting services harder to reason about

Preferred pattern:

```ts
const loadUser = (userId: string) =>
  Effect.gen(function*() {
    const repo = yield* UserRepo
    return yield* repo.getById(userId)
  })

const program = loadUser("u_123").pipe(
  Effect.provide(AppLayer)
)
```

Rule of thumb:

- business logic should require services
- composition should happen in layers
- `Effect.provide` should happen at the outermost entry boundary

### Multiple Entry Points

If your code integrates with a framework and has multiple entry points, prefer `ManagedRuntime` instead of repeatedly calling `Effect.provide` at many call sites.

Typical examples:

- HTTP handlers registered separately
- queue consumers
- cron jobs
- framework lifecycle hooks
- RPC handlers or worker callbacks

Preferred pattern:

```ts
const runtime = ManagedRuntime.make(AppLayer)

const handleRequest = (id: string) =>
  runtime.runPromise(loadUser(id))
```

Why:

- the layer graph is still composed once
- services remain shared according to layer semantics
- the framework integration gets a stable runtime boundary
- resource lifecycle is explicit through `ManagedRuntime`

Repo reference:

- `./.repos/effect/packages/effect/src/ManagedRuntime.ts`

## `Effect.provide`

Use `Effect.provide` to satisfy an effect's dependencies with a layer or context.

```ts
const program = loadUser("u_123").pipe(
  Effect.provide(UserRepoLayerReady)
)
```

This is the main boundary provisioning operator.

## `Effect.provideService`

Use `provideService` for a single ad hoc implementation.

```ts
const program = loadUser("u_123").pipe(
  Effect.provideService(UserRepo, {
    getById: (id) => Effect.succeed({ id, name: "Inline User" })
  })
)
```

Good use cases:

- small tests
- one-off overrides
- local customization

Do not use this as the default replacement for real application layers.

## `Effect.provideServiceEffect`

Use `provideServiceEffect` when one service instance must be built effectfully without creating a reusable layer.

This is useful for targeted overrides, but if the construction is reusable or part of application wiring, prefer a named `Layer.effect`.

## Best Practices

## 1. Keep service interfaces small and focused

Prefer cohesive services over giant "everything" services.

Good:

- `UserRepo`
- `Mailer`
- `Clock`-like configuration or time abstractions

Avoid:

- large service shapes that mix unrelated responsibilities

## 2. Prefer layers over manual wiring

If construction has dependencies or effects, represent it as a layer.

Avoid manually grabbing dependencies and assembling concrete objects all over the codebase.

## 2.5 Prefer Effect-native integrations over raw runtime clients

When Effect already provides a module for a capability, prefer the Effect-native integration over directly embedding a raw runtime client in service code.

Examples:

- prefer `effect/unstable/sql` modules over directly coupling business services to native SQL driver APIs
- prefer Effect HTTP modules over direct ad hoc request clients when the project is already using Effect HTTP abstractions

Why:

- resource handling, tracing, and errors stay inside the Effect model
- integrations compose better with layers and services
- observability and transactions are easier to keep consistent

## 3. Keep business logic abstract over implementations

Business functions should require services, not construct them.

Good:

```ts
const sendWelcomeEmail = (userId: string) =>
  Effect.gen(function*() {
    const repo = yield* UserRepo
    const user = yield* repo.getById(userId)
    return user
  })
```

Avoid constructing `UserRepo` inside `sendWelcomeEmail`.

## 4. Use `Layer.succeed` only for pure values

Do not hide effectful initialization inside supposedly pure service objects.

If initialization can fail, depends on effects, or needs scoped acquisition, use `Layer.effect`.

## 5. Use `Layer.effect` for owned resources

If the service opens something that must later close, model that lifecycle explicitly.

This is one of the main reasons layers exist.

## 6. Prefer top-level composition

Compose major application layers once near the boundary.

Good pattern:

- define `ConfigLayer`
- define `UserRepoLayer`
- define `Dependencies = Layer.mergeAll(...)`
- define `AppLayer` separately with `Layer.provide(...)` or `Layer.provideMerge(...)`
- provide `AppLayer` to the top-level program

## 7. Use `Layer.fresh` only when you really need a new instance

Layers are shared by default.

That is usually what you want.

Use `Layer.fresh` only when you intentionally need to bypass sharing and rebuild the layer.

## 7.5 Understand Layer Memoization

Layers are memoized by reference.

That means:

- reusing the same layer value preserves memoization and sharing
- creating a new layer value creates a new memoization identity

Because of this, functions that return layers should be avoided unless they are absolutely necessary.

Prefer plain named layer constants over layer factory functions.

Only use a function returning a layer when:

- the layer genuinely depends on runtime parameters
- the caller truly needs distinct configurations or instances
- a constant layer value cannot express the construction cleanly

Even in those cases, call the function once during construction and reuse the resulting layer value.

### Function Dependencies Should Stay Unprovided

If a dependency of a layer is itself represented by a function that returns a layer, do not call that function locally just to satisfy the dependency.

Instead, leave that dependency unprovided and let it be supplied at the edge.

Bad pattern:

```ts
const UserLayer = Layer.provide(UserRepoLayer, makeDatabaseLayer(config))
```

Why this is bad:

- it creates a fresh layer reference locally
- it breaks or weakens memoization and sharing assumptions
- it hides an important construction dependency inside subsystem wiring
- it makes the final application graph harder to understand

Preferred pattern:

```ts
const UserLayer = UserRepoLayer

const DatabaseLayer = makeDatabaseLayer(config)

const AppLayer = Layer.provideMerge(UserLayer, DatabaseLayer)
```

More generally:

- if a layer depends on a parameterized layer factory, keep that dependency in the required environment when possible
- construct the concrete parameterized layer once at the outer boundary
- provide it only at the edge where the full application graph is assembled

Rule:

- do not call layer-producing dependency functions deep inside subsystem composition
- keep those dependencies unprovided until the edge
- provide the concrete layer once in the final top-level assembly

Bad pattern:

```ts
const makeDatabaseLayer = () => Layer.effect(DatabaseService)(/* ... */)

const AppLayer = Layer.mergeAll(
  makeDatabaseLayer(),
  makeDatabaseLayer()
)
```

Why this is bad:

- each call creates a distinct layer reference
- memoization does not apply across those distinct references
- the underlying resource or service may be constructed more than once
- sharing assumptions become incorrect

Preferred pattern:

```ts
const DatabaseLayer = makeDatabaseLayer()

const AppLayer = Layer.mergeAll(
  DatabaseLayer,
  OtherLayer
)
```

Rule:

- avoid layer-producing functions unless they are truly necessary
- if a function returns a layer, call it once during construction and bind the result to a named constant
- reuse that layer value everywhere else

This is especially important for:

- database layers
- HTTP client layers
- telemetry layers
- queues, workers, and other resource-owning services

If you intentionally need a distinct instance, make that explicit with a new layer value or `Layer.fresh`, rather than accidentally creating multiple instances by repeatedly calling a layer factory.

## 8. Treat `Layer.orDie` carefully

`Layer.orDie` converts layer construction failures into defects.

Only use it when failure is truly unrecoverable at that boundary.

Do not use it to hide legitimate configuration or infrastructure failures.

## 9. Use `ManagedRuntime.make` at true runtime boundaries

If you need a reusable runtime built from a layer, `ManagedRuntime.make` is the edge tool for that.

Good use cases:

- embedding Effect into external frameworks
- scripts or hosts that repeatedly run Effect programs

Repo reference:

- `./.repos/effect/packages/effect/src/ManagedRuntime.ts`

## 10. Prefer explicit test layers

For tests, prefer:

- `Layer.succeed` for simple fakes
- `Layer.mock` for partial mocks when appropriate

This keeps test wiring explicit and close to production composition style.

## Recommended Patterns

## Pattern: service definition plus live layer

```ts
import { Context, Effect, Layer } from "effect"

class Config extends Context.Service<Config, {
  readonly apiBaseUrl: string
}>()("Config") {}

class UserRepo extends Context.Service<UserRepo, {
  readonly getById: (id: string) => Effect.Effect<{ id: string; name: string }>
}>()("UserRepo") {}

const ConfigLayer = Layer.succeed(Config)({
  apiBaseUrl: "https://api.example.com"
})

const UserRepoLayer = Layer.effect(UserRepo)(
  Effect.gen(function*() {
    const config = yield* Config

    return {
      getById: (id) =>
        Effect.succeed({
          id,
          name: `Loaded via ${config.apiBaseUrl}`
        })
    }
  })
)

const Dependencies = Layer.mergeAll(ConfigLayer)

const AppLayer = Layer.provide(UserRepoLayer, Dependencies)
```

## Pattern: provide at the top level

```ts
const program = Effect.gen(function*() {
  const repo = yield* UserRepo
  return yield* repo.getById("u_123")
}).pipe(
  Effect.provide(AppLayer)
)
```

## Pattern: single-service override in tests

```ts
const TestRepo = Layer.succeed(UserRepo)({
  getById: (id) => Effect.succeed({ id, name: "Test" })
})
```

## Anti-Patterns

- constructing live services directly inside business logic
- using `Layer.succeed` for values that actually require effectful initialization
- providing the same large layer repeatedly throughout the call graph
- collapsing unrelated responsibilities into one service
- using `Layer.orDie` to hide normal initialization failures
- bypassing layers entirely for resource-owning services

## Good Repo Examples To Study

- `./.repos/effect/packages/effect/src/Context.ts`
- `./.repos/effect/packages/effect/src/Layer.ts`
- `./.repos/effect/packages/effect/src/ManagedRuntime.ts`
- `./.repos/effect/packages/effect/src/Stream.ts`
- `./.repos/effect/packages/effect/src/unstable/sql/SqlClient.ts`
- `./.repos/effect/packages/effect/src/unstable/persistence/Persistence.ts`
- `./.repos/effect/packages/effect/src/unstable/rpc/RpcSerialization.ts`
- `./.repos/effect/packages/effect/src/unstable/reactivity/Reactivity.ts`
