---
'@c15t/dev-tools': major
---

Rebuild DevTools around the c15t v3 kernel. Pass an explicit kernel with
`createDevTools({ kernel })`; the React and TanStack entry points, window-store
discovery, and v2 instrumentation APIs have been removed.

Match the consent UI with shared theme tokens, compact consent switches, and
clearer labels. Keep DevTools above consent overlays and support closing the
floating panel with Escape.

Restore script inspection with searchable loading states, configuration details,
script lifecycle events, and a page scan for external scripts and iframes. Use the
c15t logo and preserve location drafts and scroll position during live updates.
Wrap tabs and long content within the panel, and use thin, theme-aware scrollbars.
Use an icon-only circular launcher with an accessible label.
