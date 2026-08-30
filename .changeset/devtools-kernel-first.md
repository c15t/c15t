---
'@c15t/dev-tools': major
---

Rebuild DevTools around the c15t v3 kernel. Pass an explicit kernel with
`createDevTools({ kernel })`; the React and TanStack entry points, window-store
discovery, and v2 instrumentation APIs have been removed.
