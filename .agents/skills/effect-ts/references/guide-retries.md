# Retries Guide

This guide is based on retry patterns and `ExecutionPlan` usage in the vendored Effect repo.

Key source files:

- `./.repos/effect/packages/effect/src/Effect.ts`
- `./.repos/effect/packages/effect/src/Schedule.ts`
- `./.repos/effect/packages/effect/src/ExecutionPlan.ts`
- `./.repos/effect/packages/effect/test/Effect.test.ts`
- `./.repos/effect/packages/effect/test/ExecutionPlan.test.ts`

Representative repo usage:

- `./.repos/effect/packages/effect/src/unstable/workflow/Activity.ts`
- `./.repos/effect/packages/effect/src/unstable/workflow/WorkflowEngine.ts`
- `./.repos/effect/packages/effect/src/unstable/rpc/RpcClient.ts`
- `./.repos/effect/packages/effect/src/unstable/observability/OtlpExporter.ts`
- `./.repos/effect/packages/vitest/src/internal/internal.ts`

## Mental Model

Retries in Effect are not just loops.

The repo uses three increasingly powerful levels:

1. simple `Effect.retry` options for bounded or condition-based retries
2. `Schedule` for timing-aware retry policies
3. `ExecutionPlan` for fallback across different provided resources or layers

Choose the smallest model that correctly expresses the retry policy.

## Preferred Rule

Prefer structured retry policies over ad hoc retry loops.

Use:

- simple `Effect.retry({ ... })` for straightforward conditions
- `Effect.retry(schedule)` when timing matters
- `ExecutionPlan` when retries should escalate across different layers or resources

Avoid:

- hand-written loops with mutable counters
- inline `catch` plus recursive retry logic
- resource fallback logic encoded as nested `catch` chains when `ExecutionPlan` is a better fit

## `Effect.retry`

`Effect.retry` is the main retry operator.

The vendored tests show several important supported forms.

## Retry On Success vs Failure

`Effect.retry` only retries failures.

If the effect succeeds, nothing is retried.

This is explicitly covered in the module tests.

## Simple Retry Options

### `{ times: n }`

Use this for the simplest bounded retry case.

```ts
const retried = effect.pipe(
  Effect.retry({ times: 3 })
)
```

Use this when:

- timing does not matter
- you only need a fixed retry count

### `{ until: predicate }`

Use `until` when retries should stop once the failure value satisfies a condition.

The module tests show:

- pure `until`
- effectful `until`
- that `until` is still evaluated at least once

Example:

```ts
const retried = effect.pipe(
  Effect.retry({ until: (error) => error._tag === "Done" })
)
```

### `{ while: predicate }`

Use `while` when retries should continue only while the failure value satisfies a condition.

The tests also show pure and effectful `while` variants.

Example:

```ts
const retried = effect.pipe(
  Effect.retry({ while: (error) => error._tag === "Retryable" })
)
```

## Retry With Schedule

Use a `Schedule` whenever timing matters.

```ts
const retried = effect.pipe(
  Effect.retry(Schedule.recurs(3))
)
```

Or with the richer object form:

```ts
const retried = effect.pipe(
  Effect.retry({
    schedule: Schedule.recurs(3),
    while: (error) => error._tag === "Retryable"
  })
)
```

This is a very important repo pattern because it lets you combine:

- retry timing
- retry limits
- retry predicates

## Current Schedule Metadata During Retries

The module tests show that retry execution updates `Schedule.CurrentMetadata`.

This means retry policies and retry-aware effects can inspect:

- attempt number
- elapsed time
- previous delay timing
- schedule output

Use this when:

- logging retry behavior
- building retry-aware diagnostics
- implementing advanced adaptive retry behavior

## When To Use Simple Options Vs Schedule

Prefer simple options when:

- only the retry count matters
- retry timing does not matter
- the retry rule is just a condition on the error

Prefer a schedule when:

- retry timing matters
- backoff matters
- jitter matters
- the policy should evolve over time

## Common Retry Schedules In The Repo

The vendored repo repeatedly uses these patterns:

### Fixed retry count

```ts
Schedule.recurs(3)
```

### Exponential backoff

```ts
Schedule.exponential(500, 1.5)
```

### Exponential plus steady fallback spacing

```ts
Schedule.exponential(500, 1.5).pipe(
  Schedule.either(Schedule.spaced(5000))
)
```

This appears in production modules such as RPC and workflow code.

### Error-sensitive delay policy

```ts
Schedule.forever.pipe(
  Schedule.addDelay((error) => Effect.succeed("1 second"))
)
```

The OTLP exporter uses this shape to derive delays from actual HTTP failure details such as rate limits.

## Retry Only For Specific Failures

The workflow `Activity` module shows an important advanced pattern:

- sandbox the effect
- retry only when the `Cause` matches a specific retryable category
- fail or die differently once retries are exhausted

Example shape from the repo:

```ts
effect.pipe(
  Effect.sandbox,
  Effect.retry(policy),
  Effect.catch((cause) => {
    if (!Cause.hasInterrupts(cause)) {
      return Effect.failCause(cause)
    }
    return Effect.die("interrupted and retries exhausted")
  })
)
```

Use this when:

- retryability depends on the full cause, not just typed failures
- interrupt-specific retry behavior is required
- infrastructure policy is more nuanced than a simple tagged error rule

## Retry Observability

Retry logic should be observable.

Good patterns:

- keep retries inside named `Effect.fn` operations
- use `Schedule.CurrentMetadata` for diagnostics when needed
- log or annotate retry attempts at meaningful boundaries
- prefer central retry policies over duplicating timing logic everywhere

Do not spread retry behavior across many small helpers where it becomes hard to see the operational policy.

## `ExecutionPlan`

Use `ExecutionPlan` when retries should escalate across different provided resources or layers.

This is not just about retry timing. It is about retrying the same operation under different provided environments.

The core use case from `ExecutionPlan.ts` is:

- try one layer some number of times
- possibly with a schedule and conditions
- then fall back to another layer
- then possibly fall back again

### What `ExecutionPlan` Solves

`ExecutionPlan` is the right tool when:

- the same effect should be retried against multiple alternative providers
- fallback should move across tiers, regions, models, or implementations
- retry policy includes both attempt counts and provider changes

Examples:

- fail over between multiple language model providers
- try one upstream cluster, then another
- fall back from a fast but unreliable service to a slower but more reliable one

## `ExecutionPlan.make`

Use `ExecutionPlan.make(...)` to define ordered retry/fallback steps.

Each step can include:

- `provide`
- `attempts`
- `while`
- `schedule`

Example shape:

```ts
const Plan = ExecutionPlan.make(
  {
    provide: FastLayer,
    attempts: 2,
    schedule: Schedule.spaced("3 seconds")
  },
  {
    provide: SafeLayer,
    attempts: 3,
    schedule: Schedule.spaced("1 second")
  },
  {
    provide: FinalFallbackLayer
  }
)
```

### Step Semantics

For each step:

- `provide` is the context or layer to use
- `attempts` bounds how many times that step is tried
- `while` can stop retries for that step based on the input
- `schedule` defines the timing policy for retries within that step

If `attempts` is omitted, the step attempts once unless a schedule is involved in a way that causes further retries.

## `Effect.withExecutionPlan` And `Stream.withExecutionPlan`

Use:

- `Effect.withExecutionPlan` for effects
- `Stream.withExecutionPlan` for streams

The vendored tests focus on `Stream.withExecutionPlan` and demonstrate:

- fallback from one provider to another
- fallback after partial stream failure
- the ability to prevent fallback on partial streams

This is a strong signal that `ExecutionPlan` is particularly useful for long-running or streaming integrations where failure can happen after partial success.

## `ExecutionPlan.CurrentMetadata`

`ExecutionPlan` exposes metadata with:

- `attempt`
- `stepIndex`

This is useful for:

- diagnostics
- logging which fallback tier is being used
- understanding which plan step ultimately succeeded

## `captureRequirements`

`ExecutionPlan.captureRequirements` converts a plan with requirements into one whose requirements are satisfied from the current context.

Use this when the plan should be frozen with the current environment before being applied later.

## `ExecutionPlan.merge`

Use `ExecutionPlan.merge(...)` when you need to concatenate multiple plans into one ordered plan.

This is useful for assembling more complex fallback policies out of smaller ones.

## When To Use `ExecutionPlan` Instead Of `Schedule`

Use `Schedule` when:

- only timing and retry conditions change
- the same environment/provider is used for every retry

Use `ExecutionPlan` when:

- the provider or layer should change across retry phases
- retries are tied to alternative resources, not just delays
- fallback is part of dependency provisioning strategy

## Recommended Patterns

### Pattern: simple bounded retry

```ts
const retried = effect.pipe(
  Effect.retry({ times: 3 })
)
```

### Pattern: retryable-error backoff

```ts
const retryPolicy = Schedule.exponential(500, 1.5).pipe(
  Schedule.either(Schedule.spaced(5000))
)

const retried = effect.pipe(
  Effect.retry({
    schedule: retryPolicy,
    while: (error) => error._tag === "Retryable"
  })
)
```

### Pattern: fallback across providers

```ts
const Plan = ExecutionPlan.make(
  {
    provide: PrimaryLayer,
    attempts: 2,
    schedule: Schedule.spaced("1 second")
  },
  {
    provide: SecondaryLayer,
    attempts: 3,
    schedule: Schedule.exponential(500, 1.5)
  },
  {
    provide: FinalFallbackLayer
  }
)
```

## Anti-Patterns

- hand-writing retry recursion instead of using `Effect.retry`
- embedding sleep and counters directly in business logic
- using `ExecutionPlan` when a simple `Schedule` is enough
- encoding provider fallback as a maze of nested `catch` branches
- retrying indiscriminately without checking whether the failure is actually retryable

## Good Repo Examples To Study

- `./.repos/effect/packages/effect/test/Effect.test.ts`
- `./.repos/effect/packages/effect/src/Schedule.ts`
- `./.repos/effect/packages/effect/src/ExecutionPlan.ts`
- `./.repos/effect/packages/effect/test/ExecutionPlan.test.ts`
- `./.repos/effect/packages/effect/src/unstable/workflow/Activity.ts`
- `./.repos/effect/packages/effect/src/unstable/workflow/WorkflowEngine.ts`
- `./.repos/effect/packages/effect/src/unstable/rpc/RpcClient.ts`
- `./.repos/effect/packages/effect/src/unstable/observability/OtlpExporter.ts`
