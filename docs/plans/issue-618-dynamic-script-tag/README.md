# Issue #618: `c15t/embed` Script-Tag Runtime (Styling First)

- Status: In progress (Phases 1-2 underway: backend scaffolding + runtime wiring)
- Date: 2026-02-20
- Tracking issue: https://github.com/c15t/c15t/issues/618

## Problem Statement

Script-tag users (WordPress, Webflow, Framer) need c15t UI delivery with backend-controlled styling, without changing bundled app behavior.

## Hard Constraints

1. `/init` contract stays unchanged.
2. Bundled integrations keep current behavior.
3. Milestone 1 focuses only on styling/theming/classnames.
4. UI must visually match `@c15t/react`.

## Milestone 1 Architecture

Single request for script-tag users:

1. Browser loads `GET /embed.js`.
2. Backend runs existing init logic server-side.
3. Backend includes styling options from backend config.
4. Backend returns bootstrap JS with embedded payload:
   - init payload (`jurisdiction`, `location`, `translations`, `branding`, etc.)
   - embed styling options (`ui`, `theme`, component hints)

No `/runtime-config` endpoint in this milestone.

## Package Naming

Script-tag runtime package name: `c15t/embed`.

## Deferred To Later Milestones

1. backend-driven script loader config
2. backend-driven network blocker config

## Definition Of Success

1. Script-tag users can style UI from backend config.
2. React and script-tag UI states are visually identical.
3. `/init` and bundled app behavior are unaffected.

## Progress Snapshot

1. Done: `/embed.js` route mounted, enabled via `advanced.embed.enabled`, and reuses shared init payload builder.
2. Done: backend embed options now support UI flags, theme tokens, and slot class/style overrides.
3. In progress: `@c15t/embed` runtime package now mounts React-parity UI from embedded payload; backend route now dispatches runtime bootstrap hooks.
