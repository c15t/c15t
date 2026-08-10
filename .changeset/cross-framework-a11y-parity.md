---
"@c15t/ui": patch
"@c15t/react": patch
"@c15t/vue": patch
---

Align accessibility behavior across React, Vue, and Svelte consent surfaces and enforce it in the cross-framework conformance suite.

- **Focus trap**: Vue now consumes the shared `@c15t/ui` `setupFocusTrap`/`setupScrollLock` instead of its own implementation, so initial focus, Tab/Shift+Tab wrapping, and focus restore match React/Svelte. The shared trap now wraps correctly when Shift+Tab leaves the focused container, guards focus restore with `isConnected`, and re-targets a remounted opener (e.g. the floating dialog trigger) by `id`/`data-testid` so keyboard focus is never dropped to `<body>`.
- **Escape**: the React `ConsentDialog` now closes on `Escape` (matching Vue/Svelte and the WAI-ARIA dialog pattern); banners never close on `Escape`.
- **Dialog semantics**: consistent `role="dialog"`/`aria-modal`, decorative overlay (`role="presentation"`, no click-to-dismiss), heading semantics on titles, and modal containers are `tabindex="-1"` (programmatic focus target only, not a keyboard tab stop).
- **Focus indicators**: fixed missing keyboard focus rings on `stroke`/`lighter`/`ghost` button variants (a specificity bug in the v3 button styles affected every framework) and stopped the accordion item focus ring from being clipped by the dialog's scroll container.
- Canonical `data-testid`s on the Vue consent manager/dialog surfaces.
