# 02: Runtime Loading And Performance (Single Request)

## Request Flow

Script-tag mode uses one request:

1. Browser requests `/embed.js`.
2. Server computes init payload + embed styling options.
3. Server returns bootstrap JS with embedded payload.
4. Runtime initializes store/UI from embedded payload.

No second config fetch in milestone 1.

## Non-Interference Rule

1. Bundled apps keep calling `/init`.
2. `/embed.js` is additive for script-tag users.
3. `/init` payload remains unchanged.

## Packaging

`c15t/embed` ships:

1. bootstrap runtime
2. standard UI chunk
3. IAB UI chunk (lazy if applicable)

Parity requirement:

1. UI visuals and styles must match `@c15t/react`.
2. Reuse existing `@c15t/ui` style assets and slot APIs.

## Caching Strategy

1. Cache `/embed.js` by relevant request dimensions (geo/language/config revision).
2. Optionally back with Redis/object storage in later optimization.
3. Include `revision` in embedded payload for diagnostics.

## Performance Budgets (Milestone 1)

1. Script-tag startup should not exceed current two-request path at p75.
2. Feature-disabled bundled path has zero regression.
3. Embed bootstrap parse/execute remains within agreed budget (set in benchmark task).

## Failure Behavior

1. If embed styling options are invalid, runtime falls back to base theme.
2. If init computation fails, return explicit JS error path with safe no-op behavior.

## Planned File-Level Changes

- Backend:
  - shared init payload helper under `packages/backend/src/handlers/init/`
  - new `packages/backend/src/routes/embed.ts`
  - mount route in `packages/backend/src/core.ts`
- Embed runtime package:
  - `packages/embed/*`
