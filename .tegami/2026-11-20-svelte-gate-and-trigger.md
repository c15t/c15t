---
packages:
  '@c15t/svelte': patch
---

### Fix Svelte `ConsentGate` strict policies and `ConsentDialogTrigger` interactions

- Under a policy with `scopeMode: 'strict'` that leaves the gate's category out, `ConsentGate` now shows the `consentGate.policyBlocked` message without an Enable button, and registers its category with the provider on mount so preferences list it. As in React and Vue, a category the site had not declared joins the choice scope, so a visitor who already chose is asked again about it.
- Pressing Enter or Space on `ConsentDialogTrigger` or its DevTools button now works after dragging the trigger to another corner; only the pointer click that ends a drag is ignored.
- `ConsentDialogTrigger` now renders the INTH mark when backend branding is `'inth'` or `'consent'`, matching the branding tag and the React, Vue and browser triggers.
