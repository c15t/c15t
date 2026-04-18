---
'@c15t/dev-tools': patch
---

Improve the TanStack Devtools integration so c15t behaves like a first-class
TanStack plugin.

- Add the `c15tDevtools()` plugin factory and keep `c15tDevtoolsPlugin` as a
  backward-compatible alias.
- Render the embedded c15t panel through TanStack's React plugin API instead of
  a custom imperative mount pattern.
- Keep the embedded panel instance alive across TanStack tab switches so the
  c15t store connection does not drop when the plugin view remounts.
- Restyle the embedded c15t panel to better match TanStack Devtools' dark
  palette and use a flat tab-button row instead of the overflow dropdown.
- Add a demo page that mounts TanStack Query and c15t side-by-side for repro and
  regression testing.
