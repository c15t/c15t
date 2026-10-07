---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Close the preference dialog on Escape wherever focus is

The stock preference dialog closes on Escape even when focus is outside it, as
the React and Vue dialogs do.
