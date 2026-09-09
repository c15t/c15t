---
'@c15t/core': patch
'@c15t/react': patch
'@c15t/svelte': patch
---

`enabled: false` loads consent-gated scripts immediately. A disabled runtime grants every category and skips initialization and UI, but the script loader was never mounted, so every integration in `scripts` silently never ran. Scripts now load exactly as they would after "accept all"; persistence, IAB and the blockers stay unmounted.

React providers also grant script permissions when `enabled` changes to `false` after mounting, and restore the existing consent state when re-enabled.
