# Schedule Guide

This guide is based on the vendored `Schedule` module and its usage across `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/effect/src/Schedule.ts`
- `./.repos/effect/packages/effect/test/Schedule.test.ts`

Representative repo usage:

- `./.repos/effect/packages/effect/src/unstable/workflow/WorkflowEngine.ts`
- `./.repos/effect/packages/effect/src/unstable/rpc/RpcClient.ts`
- `./.repos/effect/packages/effect/src/unstable/observability/OtlpExporter.ts`
- `./.repos/effect/packages/vitest/src/internal/internal.ts`

## Mental Model

`Schedule` is the standard Effect abstraction for:

- retries
- repeats
- polling
- backoff
- cadence and timing policies

A schedule describes when the next step should happen and when execution should stop.

The repo uses schedules heavily for:

- retry policies
- recurring work
- time-window alignment
- cron-based triggering
- bounded flaky test retries

## Preferred Rule

When the timing behavior of an effect matters, prefer expressing it with `Schedule` rather than ad hoc loops, counters, sleeps, or manual retry recursion.

Prefer:

- `Effect.retry(schedule)`
- `Effect.repeat(schedule)`
- `Effect.schedule(schedule)`
- `Stream.fromSchedule(schedule)`

Over:

- custom retry loops with mutable counters
- `Effect.forever` plus hand-written `Effect.sleep`
- manual backoff code scattered across business logic

## Common Repo Patterns

The most common patterns in the vendored repo are:

1. `Schedule.recurs(n)` for bounded retries or repeats
2. `Schedule.spaced(...)` for simple fixed spacing
3. `Schedule.fixed(...)` or `Schedule.windowed(...)` for interval-aligned work
4. `Schedule.exponential(...)` for backoff
5. `Schedule.either(...)` or sequencing combinators to combine retry policies
6. `Schedule.while(...)` to stop based on metadata or input
7. `Schedule.addDelay(...)` for custom backoff logic
8. `Schedule.jittered(...)` to avoid retry stampedes

## Retry Vs Repeat

Use schedules with the right operator:

- `Effect.retry(schedule)` for failures
- `Effect.repeat(schedule)` for successes
- `Effect.schedule(schedule)` when you want to delay/reschedule an effect directly

Good rule of thumb:

- failing workflow: `retry`
- recurring successful workflow: `repeat`
- one effect that should run on a cadence: `schedule`

## Core Constructors

### `Schedule.recurs`

Use `recurs(n)` for a bounded number of additional runs.

```ts
const retryPolicy = Schedule.recurs(3)
```

This is one of the most common repo retry policies.

### `Schedule.forever`

Use `forever` when the schedule should never terminate on its own.

```ts
const retryForever = Schedule.forever
```

This is common in infrastructure code and long-running retry loops.

### `Schedule.spaced`

Use `spaced(duration)` for simple constant spacing.

```ts
const pollEverySecond = Schedule.spaced("1 second")
```

This is the most straightforward schedule for polling or retry spacing.

### `Schedule.fixed`

Use `fixed(duration)` when work should align to fixed interval boundaries.

The tests show that this differs from simple spacing when the action itself takes time.

Use it when interval alignment matters more than naïve spacing.

### `Schedule.windowed`

Use `windowed(duration)` when you want delays to align to the nearest window boundary.

This is useful for periodic flush or batching behavior.

### `Schedule.duration`

Use `duration(duration)` for a one-shot delay schedule.

```ts
const onceAfterOneSecond = Schedule.duration("1 second")
```

### `Schedule.cron`

Use `cron(...)` for calendar-based scheduling.

The module tests cover:

- minute-level cron
- second-level cron
- calendar matching for specific weekdays and month days

Use this for:

- jobs that should follow wall-clock time
- operational schedules
- calendar-driven execution

## Backoff Patterns

### `Schedule.exponential`

Use `exponential(base, factor)` for retry backoff.

This is a dominant repo pattern.

Examples from production code:

- `WorkflowEngine`
- `RpcClient`
- persistence and eventlog modules

Typical pattern:

```ts
const retryPolicy = Schedule.exponential(500, 1.5)
```

Use this for:

- network retries
- external system retries
- contention or lock retries

### Combine exponential with a cap or fallback spacing

The repo often combines exponential backoff with a more stable spaced fallback using `Schedule.either(...)`.

Example pattern from production modules:

```ts
const retryPolicy = Schedule.exponential(500, 1.5).pipe(
  Schedule.either(Schedule.spaced(5000))
)
```

This keeps early retries responsive without letting delays grow without bound.

### `Schedule.jittered`

Use `jittered(...)` to randomize timing within safe bounds.

The module tests verify jittered delays remain within a bounded percentage of the original schedule.

Use it when:

- many workers or clients may retry at once
- you want to avoid synchronized retry storms
- the system would suffer from coordinated polling spikes

## Combinators

### `Schedule.while`

Use `while(...)` to continue only while a predicate on schedule metadata holds.

The repo uses this for:

- stopping after a number of attempts
- filtering retries based on the input error or cause
- bounding retry windows by elapsed time

Example pattern:

```ts
const bounded = Schedule.spaced("1 second").pipe(
  Schedule.while(({ attempt }) => Effect.succeed(attempt <= 5))
)
```

### `Schedule.andThenResult`

Use `andThenResult(left, right)` when one schedule should run to completion and then another should take over.

The module tests show this clearly.

Use this when:

- you want an initial aggressive policy followed by a slower steady-state policy
- you want phase-based retry or repeat timing

### `Schedule.either`

Use `either` to combine two schedules so both policies influence the resulting timing.

This appears frequently in repo retry policies that combine exponential growth with a stable fallback cadence.

### `Schedule.addDelay`

Use `addDelay` when the delay should depend on the schedule input or output.

This is a strong fit for custom retry behavior based on the actual error.

The OTLP exporter uses this style to honor `retry-after` behavior and otherwise fall back to a default delay.

Example shape:

```ts
const policy = Schedule.forever.pipe(
  Schedule.addDelay((error) =>
    Effect.succeed("1 second")
  )
)
```

Use this when:

- the delay should depend on the error
- upstream metadata such as rate-limit headers matters
- you need custom backoff without leaving the Schedule model

## Metadata

Schedules expose rich metadata including:

- input
- attempt count
- start time
- current time
- elapsed time
- elapsed since previous run
- output
- duration

This is one of the reasons schedules are better than ad hoc retry loops.

Use metadata when:

- retry behavior depends on the input error
- stop conditions depend on elapsed time
- you want to log or collect retry state

## Collection And Inspection Helpers

The module tests highlight several useful helpers:

- `Schedule.collectInputs(...)`
- `Schedule.collectOutputs(...)`
- `Schedule.collectWhile(...)`
- `Schedule.delays(...)`
- `Schedule.reduce(...)`

Use these when:

- you need to inspect or test a schedule
- you want to accumulate state across schedule steps
- you are building a more specialized scheduling policy

These are especially useful in tests and low-level policy construction.

## Typical Policies

### Simple bounded retry

```ts
const retryPolicy = Schedule.recurs(3)
```

### Spaced polling

```ts
const pollPolicy = Schedule.spaced("5 seconds")
```

### Exponential retry with a stable fallback cadence

```ts
const retryPolicy = Schedule.exponential(500, 1.5).pipe(
  Schedule.either(Schedule.spaced("5 seconds"))
)
```

### Retry forever with custom delay logic

```ts
const retryPolicy = Schedule.forever.pipe(
  Schedule.addDelay((error) => Effect.succeed("1 second"))
)
```

### Cron-driven recurring job

```ts
const nightly = Schedule.cron("0 0 * * *")
```

## Testing Schedules

The repo tests schedules with `TestClock` and controlled stepping.

Preferred pattern:

- use `TestClock`
- advance time explicitly
- inspect emitted delays or outputs

This keeps schedule tests deterministic.

The module tests also use helpers built on `Schedule.toStepWithSleep(...)` to inspect schedule behavior precisely.

## Best Practices

1. Prefer `Schedule` over ad hoc retry loops.
2. Prefer `Schedule.recurs(...)` for simple bounded retries.
3. Prefer `Schedule.exponential(...)` for backoff.
4. Prefer `Schedule.either(...)` or sequencing combinators to compose retry phases.
5. Prefer `Schedule.addDelay(...)` when delay depends on the actual error.
6. Prefer `Schedule.jittered(...)` for distributed retry behavior.
7. Prefer metadata-driven stop conditions over mutable counters.
8. Prefer testing schedules with `TestClock`.

## Anti-Patterns

- hand-writing retry loops with mutable counters and sleeps
- putting backoff logic directly in business code instead of in a schedule
- using `Effect.forever` with embedded `sleep` as a substitute for a schedule
- scattering retry timing logic across many call sites
- ignoring jitter when many clients or workers retry concurrently

## Good Repo Examples To Study

- `./.repos/effect/packages/effect/src/Schedule.ts`
- `./.repos/effect/packages/effect/test/Schedule.test.ts`
- `./.repos/effect/packages/effect/src/unstable/workflow/WorkflowEngine.ts`
- `./.repos/effect/packages/effect/src/unstable/rpc/RpcClient.ts`
- `./.repos/effect/packages/effect/src/unstable/observability/OtlpExporter.ts`
- `./.repos/effect/packages/vitest/src/internal/internal.ts`
