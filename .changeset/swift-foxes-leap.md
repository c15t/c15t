---
"@c15t/ui": minor
"@c15t/react": patch
---

feat(primitives): shared UI primitive runtime, framework adapters, and runtime performance

- Extract seven framework-agnostic primitives into `@c15t/ui/primitives`: accordion, button, collapsible, dialog, switch, tabs, and preference-item
- Add `PreferenceItem` compound component that unifies three separate expandable-row patterns (Radix Accordion, custom button + AnimatedCollapse, manual state) into a single composable primitive with semantic slots
- Publish framework adapter packages (`@c15t/solid`, `@c15t/vue`, `@c15t/svelte`) re-exporting shared primitives and CSS variant generators
- Add cross-framework storybooks with shared play-function interaction tests and CI test-runner integration

**Mobile viewport fixes:**
- Add `box-sizing: border-box` to all fixed-position consent roots (banner, dialog, IAB variants) — prevents horizontal overflow on narrow viewports
- Constrain dialog card with `max-height: 100%` and scrollable content area — prevents title/description from being pushed off-screen on small devices

**Runtime performance (react-browser-bench, full-ui scenario):**
- Memoize `useTheme()` deep merge with `useMemo` — reduces calls from 35 to 23 (-35%), total time from 0.10 ms to 0.02 ms (-80%)
- Replace `offsetWidth`/`offsetHeight` visibility checks in focus trap with `checkVisibility()` API — eliminates forced synchronous layout on every Tab keypress
- Both optimizations are in `@c15t/ui` and benefit all frameworks equally
