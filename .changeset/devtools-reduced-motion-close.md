---
"@c15t/dev-tools": patch
---

Fix the DevTools panel getting stuck open when `prefers-reduced-motion: reduce` is enabled. The close button and backdrop now close the panel right away when there is no exit animation, and closing falls back to a timeout if `animationend` never fires.
