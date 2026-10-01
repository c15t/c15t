---
packages:
  '@c15t/dev-tools': patch
  '@c15t/react': patch
---

### Match the DevTools panel to its host theme

Embedded DevTools panels, in Nuxt DevTools and in the TanStack Devtools plugin, now use their own light and dark palette instead of the app's consent theme. The TanStack plugin follows the TanStack Devtools theme. Before this change, a dark TanStack Devtools showed a white c15t panel.

The floating panel no longer mixes the page's consent theme with operating-system colors. Danger and success colors come from the panel's own surface and text, so they stay readable in light and dark themes.

When an embedded panel is at least 48rem wide, it switches to a layout built for a devtools pane instead of stretching the floating card. Consent categories and vendors become tiles. Location, Actions, and Policy details sit in two columns. Scripts show name, source, and status on one row. Events show as a log, with each event's data behind a "Data" toggle. Embedded panels use 14px text on devices without a touchscreen. Narrow panes and the floating panel keep the single-column card, and narrow embedded panes wrap their tabs instead of clipping them.

The panel also has a clearer layout. Each form has one filled primary button. Effective consent, vendor access, and script state show as colored status pills. Clearing stored records now has its own section. On devices without a touchscreen, the floating panel uses the same compact controls as embedded panels.

`c15tDevtools()` now returns a render function, which TanStack Devtools calls with its theme. `C15tTanStackDevtoolsPanel` accepts a `theme` prop of `'light'` or `'dark'`.
