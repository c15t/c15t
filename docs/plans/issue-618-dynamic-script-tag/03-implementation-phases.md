# 03: Implementation Phases (Single Request, Styling First)

## Phase 0: Contract Lock

1. Lock `/embed.js` payload contract.
2. Lock `advanced.embed.options` backend config shape.
3. Lock parity requirement with `@c15t/react`.

## Phase 1: Backend Embed Scaffolding

Scope:

1. add `advanced.embed` config typing
2. add shared init payload builder
3. implement `GET /embed.js` route that embeds:
   - init payload
   - styling options

Touchpoints:

- `packages/backend/src/types/index.ts`
- `packages/backend/src/handlers/init/*`
- `packages/backend/src/routes/embed.ts`
- `packages/backend/src/routes/index.ts`
- `packages/backend/src/core.ts`

Acceptance:

1. `/embed.js` returns valid JS bootstrap payload.
2. `/init` behavior is unchanged.

Current state:

1. In progress: route + shared init builder are implemented.
2. In progress: styling/theme/classname options are wired from backend config into `/embed.js`.

## Phase 2: `c15t/embed` Runtime Wiring

Scope:

1. bootstrap runtime consumes embedded payload
2. initialize UI/store from embedded init data
3. apply backend styling options

Touchpoints:

- `packages/embed/*`
- shared runtime helpers as needed

Acceptance:

1. UI renders correctly from one request.
2. style overrides apply correctly.

Current state:

1. In progress: new `packages/embed` runtime package scaffolding is added.
2. In progress: runtime mounts `ConsentManagerProvider + ConsentBanner + ConsentDialog` from `window.__c15tEmbedPayload`.

## Phase 3: Visual Parity Hardening

Scope:

1. enforce parity snapshots vs `@c15t/react`
2. verify standard/dialog/widget/iab states
3. polish remaining visual diffs

Acceptance:

1. parity snapshots pass.
2. WordPress/Webflow/Framer smoke tests pass.

## Phase 4: Docs And Release

Scope:

1. document backend embed config
2. document script-tag install usage (`c15t/embed`)
3. release notes for styling-first milestone

## Deferred Milestones

1. backend-driven script loader config
2. backend-driven network blocker config
