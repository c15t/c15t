---
'@c15t/dev-tools': minor
---

Render the DevTools panel inside a shadow root that carries its own stylesheet, so a host page's global rules (`button { background: hotpink !important }` and the like) can no longer restyle it and its CSS no longer lands in `<head>`. `element` is still the panel root; reach it through the host's `shadowRoot`, or pass `shadow: false` to keep the previous light-DOM mount.
