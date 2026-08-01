# Testing Guide

This guide is based on the vendored `@effect/vitest` package in `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/vitest/src/index.ts`
- `./.repos/effect/packages/vitest/src/internal/internal.ts`
- `./.repos/effect/packages/vitest/test/index.test.ts`
- `./.repos/effect/packages/vitest/typetest/index.tst.ts`

## Preferred Rule

When testing Effect code with Vitest, prefer `@effect/vitest` over manually calling `Effect.runPromise`, `Effect.runSync`, or ad hoc runtime setup inside ordinary Vitest tests.

Layer provisioning in tests should follow these rules:

1. If multiple tests should share the same layered setup, use `layer(...)`.
2. If a nested group needs extra dependencies, use `it.layer(...)`.
3. If tests need isolated layer instances per test, use multiple separate `it.layer(...)` calls.
4. Do not default to local `.pipe(Effect.provide(...))` inside test bodies.

Use:

- `it.effect` for Effect-based tests with test services
- `it.live` for Effect-based tests that should use live services
- `layer(...)` and `it.layer(...)` for shared layered test setup
- `it.effect.prop` for Effect-based property tests

Do not default to `.pipe(Effect.provide(SomeLayer))` inside test bodies when `layer(...)` or `it.layer(...)` expresses the setup more clearly.

## Imports

Preferred imports for Effect tests:

```ts
import { assert, describe, it, layer } from "@effect/vitest"
import { Effect } from "effect"
```

`@effect/vitest` re-exports Vitest, so it is the normal entrypoint for test APIs in an Effect codebase.

## Core Test Modes

## `it.effect`

Use `it.effect` for most Effect tests.

It automatically:

- runs the effect
- scopes it correctly
- provides the default test environment

The default test environment includes:

- `TestConsole`
- `TestClock`

This comes directly from the internal implementation.

Example:

```ts
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"

it.effect("loads a user", () =>
  Effect.gen(function*() {
    yield* Effect.void
    assert.isTrue(true)
  })
)
```

Use `it.effect` when:

- the test uses ordinary Effect code
- the test benefits from `TestClock`
- the test benefits from `TestConsole`
- the test should run in a scoped Effect runtime

## `it.live`

Use `it.live` when the test should use live services instead of the default test environment.

Example:

```ts
it.live("uses live services", () =>
  Effect.gen(function*() {
    yield* Effect.void
  })
)
```

Use `it.live` when:

- you need the real `Clock`
- the test should interact with live runtime services
- you deliberately do not want the test environment overrides

Rule of thumb:

- default: `it.effect`
- opt into `it.live` only when you actually need live behavior

## Effect Test Structure

Preferred pattern:

```ts
it.effect("does something", () =>
  Effect.gen(function*() {
    const value = yield* someEffect
    assert.strictEqual(value, 1)
  })
)
```

Prefer `Effect.gen` inside `it.effect` and `it.live` for readability.

Avoid:

- `it("...", async () => ...)` for Effect programs
- `Effect.runPromise(...)` inside plain Vitest tests
- manual runtime setup for routine Effect tests

## Assertions

Use `assert` for Effect tests.

The vendored repo also uses `expect` in some tests, but for skill guidance prefer `assert` in Effect-based tests because it keeps tests more uniform and explicit inside Effect programs.

Examples:

```ts
assert.isTrue(value === 1)
assert.strictEqual(a + b, b + a)
assert.include(text, substring)
```

## Test Context

`it.effect` and `it.live` test functions can receive a Vitest `TestContext`.

Example:

```ts
it.effect("uses context", (ctx) =>
  Effect.gen(function*() {
    ctx.onTestFailed(() => {
      // cleanup or diagnostics
    })
  })
)
```

Use this when you need:

- failure hooks
- abort signals
- ordinary Vitest test context integration

## `each`, `skip`, `skipIf`, `runIf`, `only`, `fails`

The Effect testers support the standard test variants:

- `it.effect.each(...)`
- `it.live.each(...)`
- `it.effect.skip(...)`
- `it.effect.skipIf(...)`
- `it.effect.runIf(...)`
- `it.effect.only(...)`
- `it.live.fails(...)`

Examples from the vendored tests show these are first-class parts of the API.

Use them exactly as you would with Vitest, but return `Effect` from the test body.

## Property Testing

There are two different property-test entrypoints and they do not have identical behavior.

## Top-level `it.prop`

Use `it.prop` for non-Effect property tests.

Example:

```ts
import { it } from "@effect/vitest"
import { FastCheck } from "effect/testing"

const realNumber = FastCheck.float({ noNaN: true, noDefaultInfinity: true })

it.prop("symmetry", [realNumber, FastCheck.integer()], ([a, b]) => a + b === b + a)
```

Important limitation from the internal implementation:

- top-level `it.prop` does not support `Schema` arbitraries yet
- if you pass a `Schema`, it throws

So use top-level `it.prop` only with explicit `FastCheck` arbitraries.

## `it.effect.prop`

Use `it.effect.prop` for property tests that return `Effect`.

This is the more powerful property-testing mode for Effect code.

Example:

```ts
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { FastCheck } from "effect/testing"

const realNumber = FastCheck.float({ noNaN: true, noDefaultInfinity: true })

it.effect.prop("symmetry", [realNumber, FastCheck.integer()], ([a, b]) =>
  Effect.gen(function*() {
    assert.strictEqual(a + b, b + a)
  })
)
```

Unlike top-level `it.prop`, `it.effect.prop` does support `Schema` inputs by converting them with `Schema.toArbitrary`.

So prefer `it.effect.prop` when:

- the property test needs `Effect`
- you want to use `Schema` values as arbitraries
- the test needs Effect services or scope

## `layer(...)`

Use top-level `layer(...)` to share a `Layer` across a group of tests.

Hard rule:

- use `layer(...)` when tests should share one layered setup
- do not use it when each test needs its own isolated layer instance

This is one of the most important `@effect/vitest` features.

Example:

```ts
import { describe, it, layer } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"

class Foo extends Context.Service<Foo, string>()("Foo") {
  static readonly layer = Layer.succeed(Foo)("foo")
}

describe("foo", () => {
  layer(Foo.layer)((it) => {
    it.effect("gets foo", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        return foo
      })
    )
  })
})
```

What it does internally:

- builds the layer once for the test group
- memoizes the built layer with a `MemoMap`
- keeps the scope open for the group
- closes the scope in `afterAll`

This makes it the preferred way to share layer setup across related tests.

This is also the preferred alternative to calling `Effect.provide(...)` inside each individual test body.

## Anti-Pattern: Local `Effect.provide(...)` In Tests

If multiple tests use the same layer, do not write tests like this:

```ts
it.effect("creates and lists todos", () =>
  Effect.gen(function*() {
    const service = yield* TodoService
    yield* service.create("write tests")
    yield* service.create("ship feature")
  }).pipe(
    Effect.provide(TodoService.inMemoryLayer)
  )
)
```

Why this is the wrong pattern:

- it repeats provisioning in every test
- it hides the layered test setup inside each test body
- it fights the `@effect/vitest` layer helpers
- it makes shared setup and teardown less explicit
- it bypasses the clearer grouped-layer style that the library is designed for

Prefer:

```ts
describe("TodoService", () => {
  layer(TodoService.inMemoryLayer)((it) => {
    it.effect("creates and lists todos", () =>
      Effect.gen(function*() {
        const service = yield* TodoService
        yield* service.create("write tests")
        yield* service.create("ship feature")
      })
    )

    it.effect("updates completion and deletes todos", () =>
      Effect.gen(function*() {
        const service = yield* TodoService
        const todo = yield* service.create("close issue")
        yield* service.setCompleted(todo.id, true)
        yield* service.remove(todo.id)
      })
    )
  })
})
```

Rule:

- if a test or group of tests depends on a layer, prefer `layer(...)`
- if a nested group needs extra dependencies, prefer `it.layer(...)`
- if tests need isolated layer instances per test, use multiple separate `it.layer(...)` calls
- use local `Effect.provide(...)` in tests only for true one-off edge cases, not as the normal pattern

This matches the general layer guidance: provisioning belongs at the boundary, and in `@effect/vitest` the test boundary should usually be expressed with `layer(...)` rather than ad hoc local provisioning.

## `it.layer(...)`

Use `it.layer(...)` inside an existing layered test group to add nested layer context.

Hard rule:

- use `it.layer(...)` when a specific test or nested test block should get its own isolated layered setup
- if isolation matters, prefer multiple separate `it.layer(...)` calls over one shared `layer(...)` group

Example:

```ts
layer(Foo.layer)((it) => {
  it.layer(Bar.layer)("nested", (it) => {
    it.effect("gets both", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        const bar = yield* Bar
        return [foo, bar]
      })
    )
  })
})
```

Important behavior from the implementation:

- nested `it.layer(...)` reuses the parent memo map
- nested `it.layer(...)` does not accept `memoMap` or `excludeTestServices`
- nested layering is meant to extend the current layered test environment, not redefine its runtime policy

Use multiple `it.layer(...)` blocks when each test should get its own isolated layered setup instead of sharing one top-level `layer(...)` group.

## `layer` Options

The top-level `layer(...)` helper accepts:

- `timeout`
- `memoMap`
- `excludeTestServices`

### `excludeTestServices`

By default, `layer(...)` merges your layer with the test environment (`TestClock` and `TestConsole`).

Use `excludeTestServices: true` when you want your layer group to run without those test-service overrides.

This is useful for tests that should keep live runtime behavior.

### `memoMap`

Use `memoMap` only when you have a specific reason to coordinate layer memoization manually across test setups.

Most tests should let `@effect/vitest` manage it.

## Scoped Resources In Tests

`@effect/vitest` is designed to work correctly with scoped effects and layered resources.

The vendored tests explicitly verify resource release through `afterAll`.

Use this normally:

- define scoped services in layers
- use `layer(...)` to share them
- let the helper own scope setup and teardown

Avoid manually managing large scopes in test code unless the test specifically needs that control.

## `flakyTest`

Use `flakyTest` for tests that need bounded retrying.

Repo behavior:

- wraps the test in `Effect.scoped`
- retries using a schedule
- retries for up to a timeout window
- converts final failure to defect with `Effect.orDie`

Use this only for truly flaky integration-style conditions, not as a substitute for deterministic tests.

## `makeMethods` And `describeWrapped`

These exist for custom integration and wrapper scenarios.

### `makeMethods`

Use `makeMethods` when you need to extend or wrap a custom Vitest `it` instance while preserving Effect-aware helpers.

### `describeWrapped`

Use `describeWrapped` when you want a `describe` wrapper that hands you the augmented Effect-aware `it` methods directly.

Most test code can just use imported `describe` and `it` from `@effect/vitest`.

## Equality Testers

`addEqualityTesters()` exists as part of the public API.

Use it only when you have a concrete need to install equality testers for your Vitest environment.

It is not needed for ordinary test structure.

## Recommended Patterns

### Pattern: normal Effect test

```ts
it.effect("does work", () =>
  Effect.gen(function*() {
    const value = yield* Effect.succeed(1)
    assert.strictEqual(value, 1)
  })
)
```

### Pattern: shared layer for a test group

```ts
layer(AppLayer)("app", (it) => {
  it.effect("uses app services", () =>
    Effect.gen(function*() {
      yield* Effect.void
    })
  )
})
```

### Pattern: property test with Effect

```ts
it.effect.prop("law", [FastCheck.integer()], ([n]) =>
  Effect.gen(function*() {
    assert.strictEqual(n + 0, n)
  })
)
```

### Pattern: use `TestClock`

```ts
it.effect("uses TestClock", () =>
  Effect.gen(function*() {
    const fiber = yield* Effect.forkChild(Effect.sleep("1 second"))
    yield* TestClock.adjust("1 second")
    yield* Fiber.join(fiber)
  })
)
```

## Anti-Patterns

- using plain `it(...)` with `Effect.runPromise(...)` for normal Effect tests
- using `it.live` by default when `it.effect` is sufficient
- manually building and tearing down large layer graphs instead of using `layer(...)`
- using top-level `it.prop` with `Schema` inputs
- using `flakyTest` to hide deterministic failures
- duplicating runtime setup instead of sharing a layer

## Good Repo Examples To Study

- `./.repos/effect/packages/vitest/test/index.test.ts`
- `./.repos/effect/packages/vitest/src/index.ts`
- `./.repos/effect/packages/vitest/src/internal/internal.ts`
- `./.repos/effect/packages/vitest/typetest/index.tst.ts`
