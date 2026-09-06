# Parity runner

Cross-framework conformance for the c15t consent surfaces. It loads the
same story from every framework's Storybook and asserts they are the same
component, not just components with the same name.

React is the baseline. Everything else is measured against it.

## The checks

`tests/parity.spec.ts` — descriptive parity:

- **DOM** — normalized tree, with framework-specific class hashing and
  auto-generated ids stripped.
- **A11y** — the accessibility tree.
- **Computed style** — every declared property and CSS custom property on
  every `[data-testid]` element.
- **Screenshot** — a per-framework committed baseline, which catches
  regressions inside one framework. It is not a cross-framework diff.

`tests/visual-parity.spec.ts` — visual parity:

- **Geometry** — every `[data-testid]` slot's box (`x`, `y`, `width`,
  `height`), measured relative to the card it sits in, must match React
  within **1px**. Deterministic and image-free.

  This exists because the descriptive checks are blind to a whole class of
  drift. A `<h2 data-testid="consent-banner-title">` and a
  `<div role="heading" data-testid="consent-banner-title">` have the same
  normalized DOM, the same a11y node and the same declared CSS — and the
  `<h2>` carries the user agent's 13.28px block margins, making the banner
  card 26px taller. Nothing but a measurement sees that.

  Boxes are relative to the card, not the viewport, because each Storybook
  wraps stories differently; the absolute offset would only ever measure
  the wrapper. Repeated slots are indexed (`consent-banner-footer-sub-group`,
  `consent-banner-footer-sub-group[1]`), so a framework that groups its
  footer actions differently fails on the count.

- **Pixel backstop** — element screenshots of `consent-banner-card` and
  `consent-dialog-card`, compared to React with a per-channel tolerance of
  **12** and a mismatch budget of **0.5%** of pixels. Loose on
  antialiasing, which is never identical between two renderers; strict on
  size, where a mismatch fails outright. Failures attach the two
  screenshots and a diff image to the Playwright report.

  Font rasterisation is machine-specific, so the budget is calibrated for
  CI's pinned Chromium. Set `PARITY_SKIP_PIXEL=1` to skip it locally.

## The allowlist

`src/parity-allowlist.ts` records drift that is real, known, and not the
current branch's job to fix. Entries are keyed by check, framework, story
and slot, and every one carries a **required** reason — a link, an issue,
or the constraint that forces it. An entry with a vague reason is worse
than a red test, because it hides one without recording why.

`'*'` matches everything in a position. Prefer the narrowest key that
covers the drift, so an unrelated regression in the same story still
fails. A bare slot id matches every repeat index of that slot.

Nothing expires on its own, so the geometry check fails on any entry that
matched nothing during a run — delete a stale allowance rather than
leaving it to rot.

## Running it

Every Storybook has to be built and served first:

```sh
bun turbo run build --filter=@c15t/storybook-react --filter=@c15t/storybook-svelte \
  --filter=@c15t/storybook-vue --filter=@c15t/storybook-astro

bunx http-server apps/storybook-react/storybook-static  --port 6006 --silent &
bunx http-server apps/storybook-svelte/storybook-static --port 6007 --silent &
bunx http-server apps/storybook-vue/storybook-static    --port 6008 --silent &
bunx http-server apps/storybook-astro/storybook-static  --port 6010 --silent &

PARITY_FRAMEWORKS=react,svelte,vue,astro PARITY_SKIP_PIXEL=1 \
  bun run --cwd apps/parity-runner test:parity --ignore-snapshots
```

| Variable | Default |
| --- | --- |
| `REACT_STORYBOOK_URL` | `http://127.0.0.1:6006` |
| `SVELTE_STORYBOOK_URL` | `http://127.0.0.1:6007` |
| `VUE_STORYBOOK_URL` | `http://127.0.0.1:6008` |
| `SOLID_STORYBOOK_URL` | `http://127.0.0.1:6009` |
| `ASTRO_STORYBOOK_URL` | `http://127.0.0.1:6010` |
| `PARITY_FRAMEWORKS` | `react,svelte` |
| `PARITY_SKIP_PIXEL` | unset |
| `PARITY_DEBUG` | unset — prints the first DOM/a11y diff |

`--ignore-snapshots` skips the per-framework screenshot baselines, which
are darwin-only. `--update-snapshots` regenerates them.

## Pairing

Stories pair by stripping the `{FRAMEWORK}` segment from the Storybook
title, so `COMPONENTS - REACT/Core/Consent Banner` pairs with
`COMPONENTS - SVELTE/Core/Consent Banner` and
`COMPONENTS - ASTRO/Core/Consent Banner`. The rest of the title is part of
the key: rename a section in one Storybook and that framework silently
drops out of every comparison.

## DevTools

Run just the DevTools comparisons:

```sh
PARITY_FRAMEWORKS=react,svelte,vue bun run --cwd apps/parity-runner test:parity devtools.spec.ts
```

This checks all seven tabs and the circular launcher at desktop and mobile
sizes, in light and dark mode. It compares the floating panel itself, including
its portaled content, through DOM, accessibility, computed styles, and exact
screenshots. It also rejects horizontal overflow and off-screen placement.

React is the reference for each browser run. Screenshots are attached to the
Playwright report, so no OS-specific baseline update is needed. These checks
still run when CI passes `--ignore-snapshots`. They detect differences between
frameworks, not a visual change shared by every framework. Revision counters,
generated instance IDs, and anonymized script IDs are normalized; event history
is cleared before comparison.

Storybook's `devtools` stories also run the shared consent/script interaction
contract in each framework. React has a separate story using the real TanStack
Devtools host, including host unmount/remount. That story is tested for behavior
and deliberately excluded from visual comparisons.

```sh
STORYBOOK_URL=http://127.0.0.1:6006 bun run --cwd apps/storybook-react test-storybook --includeTags devtools
```
