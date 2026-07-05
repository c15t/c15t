# RFC 0003: Own Vue Primitives (Reka Replacement)

Status: **Implemented & measured.** All five primitives shipped
(`packages/vue/src/runtime/primitives/`), Reka-compatible export names,
`reka-ui` dependency removed. Results:

| metric | Reka | own | delta |
|---|---:|---:|---:|
| bench app total JS | 548.4KB / 177.3KB gz | 511.9KB / 167.1KB gz | **-36.5KB / -10.2KB gz** |
| banner visible (mobile+200ms, both manifest arms) | — | — | **±1ms (neutral)** |

Honest read: the byte win is real (install weight, chunk sizes, one fewer
dependency tree) but does NOT move banner-visible under throttle — the
banner path's Reka share (FocusScope+Switch) was small, and the big Dialog/
Accordion savings live in the lazy manager chunk, off the measured path.
Wins land in: first-open latency of the manager chunk (-~9KB gz), eager path
(~-4.5KB gz), dependency hygiene. Tests: vue 30 + conformance 20/20 green;
`data-*` CSS contract unchanged.

Original analysis follows.

## Measured head-to-head (tree-shaken, minified / gzip)

React's hand-rolled primitives (`packages/react/src/v3/components/shared/ui`)
are the existence proof for what "own" costs; Reka measured via esbuild with
`vue` external, React's with `react`/`@c15t/ui` external:

| primitive | Reka (Vue today) | React hand-rolled | ratio |
|---|---|---|---|
| Dialog (Root/Portal/Overlay/Content) | 32.6KB / 11.0KB | 3.9KB / 1.7KB | ~6× |
| Accordion (5 parts) | 22.4KB / 8.0KB | 5.0KB / 2.0KB | ~4× |
| Switch | 10.9KB / 4.1KB | 1.2KB / 0.6KB | ~7× |
| FocusScope | 7.7KB / 3.2KB | (inside dialog's 3.9KB) | — |
| **All, deduped** | **52.5KB / 16.5KB** | **9.3KB / 3.4KB** | **~5×** |

Individual rows share internal code — use the deduped totals for decisions.

## Expected impact (post lazy-split layout)

- **Eager (banner) path:** FocusScope + Switch ≈ 5.6KB gz → own ≈ 1KB →
  **~4.5KB gz off every page load**
- **Lazy manager/dialog chunk:** Dialog + Accordion ≈ 11–13KB gz → own ≈ 3KB
  → **~9KB gz off the chunk**, directly shrinking first-open latency and the
  throttled-mobile parse cost that dominates Nuxt's consent tax
- Also removes a whole dependency (and its floating-ui transitive graph) from
  `@c15t/vue`'s tree

## Why the a11y objection is weaker than it was

Hand-rolling dialogs is where this repo's a11y bugs came from (the original
Vue IAB dialog: no Escape, broken tabs ARIA). Two things changed:

1. **React's implementations are the ported-from reference** — audited this
   session (a11y drift fixed, 402 tests, conformance 20/20, deflaked legacy
   e2e). This is porting proven behavior to Vue, not designing from scratch.
2. **The conformance suite + a11y invariants now exist as the net** — the
   spec-first rule applies: the Vue primitives must pass the same behavioral
   contract before replacing Reka per-surface.

## Scope (in order; each step independently shippable behind the same API)

1. `switch.vue` — trivial (data-state + toggle helpers already exist in
   `@c15t/ui/primitives/shared`, which are framework-agnostic and stay the
   single source of truth for state conventions)
2. `focus-trap` composable — port React dialog's focus handling (sentinel
   tabbing, restore-on-close, initial focus)
3. `accordion.vue` — port React's (keyboard nav, aria wiring from the fixed
   implementation)
4. `dialog.vue` — Teleport + Escape + scroll-lock + focus-trap composable;
   the careful one; do last
5. Per-step: swap into the consent components, keep `data-*` attribute
   contract identical (CSS untouched), conformance + vue suite green,
   re-measure the two chunks

## Non-goals

- Replacing `@vueuse` (2 functions, 2KB — not worth owning)
- Any visual change — `@c15t/ui/styles/v3` selectors target `data-*`
  attributes, which the own primitives must emit identically

## Verdict

Recommended. Earlier "keep Reka" reasoning assumed hand-rolling from scratch;
the measured React precedent (5× smaller, now audited) and the conformance
net change the calculus. ~13KB gz total savings for a consent library is a
meaningful fraction of the remaining budget.
