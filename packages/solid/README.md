# @c15t/solid

> **Status: placeholder — not a supported c15t integration (yet).**

This private package currently re-exports the framework-agnostic primitives
from `@c15t/ui` only. It ships **no** provider, components, composables, or
kernel wiring, and it is intentionally excluded from the published packages.

## What "supported" would mean

A real Solid adapter must reach behavioral parity with the other kernel-based
integrations (`@c15t/react`, `@c15t/svelte`, `@c15t/vue`):

- A provider wiring the shared kernel (`c15t`) with script-loader,
  network-blocker, iframe-blocker, and persistence modules
- `ConsentBanner`, `ConsentDialog`, `ConsentWidget`, IAB components matching
  the shared DOM/ARIA contract (`@c15t/conformance/contract`)
- A real conformance driver (the current one in `src/__tests__/` is a stub:
  every capability throws `DriverNotImplementedError`, so the shared suite
  reports `todo` for Solid rather than false passes)
- Enrollment in the Storybook parity matrix (`apps/storybook-solid`,
  `apps/parity-runner`)

## Why keep the stub?

The stub conformance driver keeps Solid visible on the cross-framework parity
scoreboard as explicit `todo`s. If/when Solid support is prioritized, replace
the stub driver capabilities one by one — the suite will flip from `todo` to
enforced automatically.
