# 04: Testing, Rollout, And Risks (Single Request, Styling First)

## Test Matrix

## Backend

1. `advanced.embed` config parsing tests.
2. `/embed.js` response tests:
   - disabled mode
   - enabled mode
3. shared init builder parity tests (`/init` vs embed payload content equivalence where applicable).

## Embed Runtime

1. embedded payload boot tests.
2. styling/theme merge tests.
3. invalid styling payload fallback tests.

## Visual Parity

1. screenshot parity vs `@c15t/react`:
   - banner
   - dialog
   - widget
   - IAB states

## Platform Smoke

1. plain HTML
2. WordPress
3. Webflow
4. Framer

## Performance

1. compare single-request `/embed.js` vs prior two-request approach.
2. ensure no regression in bundled `/init` path.

## Rollout

Flag:

1. `advanced.embed.enabled` (default false)

Steps:

1. internal canary
2. beta users
3. broader rollout

## Risks

## R1: Visual drift from React UI

Mitigation:

1. parity snapshots
2. shared style primitives only

## R2: Bootstrap payload size growth

Mitigation:

1. keep payload styling-first only
2. move heavier config categories to later milestones

## R3: Existing app regression

Mitigation:

1. keep `/init` unchanged
2. keep embed feature behind flag

## Rollback

1. disable `advanced.embed.enabled`
2. script-tag users revert to previous integration path

## Deferred

1. script loader config from backend
2. network blocker config from backend
