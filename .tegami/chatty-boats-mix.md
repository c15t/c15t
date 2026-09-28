---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Restore category discovery and consent completion

Restore category discovery from scripts, frames, and network rules. Merge discovered categories with `consentCategories` within the policy scope, and use the same set for the dialog and consent completion. Keep the banner dismissed after accepting the displayed categories and reloading. Enable tagged iframe discovery and blocking by default in React, matching the shared runtime.
