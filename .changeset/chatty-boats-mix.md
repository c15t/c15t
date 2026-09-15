---
"@c15t/core": patch
"@c15t/react": patch
"@c15t/vue": patch
"@c15t/svelte": patch
"@c15t/browser": patch
---

Restore category discovery from scripts, frames, and network rules. Merge discovered categories with `consentCategories` within the policy scope, and use the same set for the dialog and consent completion. Keep the banner dismissed after accepting the displayed categories and reloading. Enable tagged iframe discovery and blocking by default in React, matching the shared runtime.
