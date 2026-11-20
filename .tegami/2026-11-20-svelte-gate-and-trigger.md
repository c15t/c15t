---
packages:
  '@c15t/svelte': patch
---

### Fix Svelte `ConsentGate` and `ConsentDialogTrigger`

- `ConsentGate` shows the blocked message with no button when a strict policy
  leaves its category out. It also registers its category so preferences list
  it, which can ask a returning visitor about that category again.
- `ConsentDialogTrigger` answers Enter and Space after a drag.
- `ConsentDialogTrigger` shows the same brand mark as the branding tag.
