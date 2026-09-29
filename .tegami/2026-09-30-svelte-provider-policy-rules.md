---
packages:
  '@c15t/svelte': patch
---

### Remove the unused `policyRules` option from `ConsentManagerProvider`

`ConsentManagerOptions` accepted `policyRules`, but no Svelte transport read
it: `offline()` resolved its own rules or the recommended pack, so rules
passed to the provider were ignored without a warning. The option is gone
from the type, which matches `ConsentProvider` in `@c15t/react`. Pass rules
to the transport instead:

```svelte
<ConsentManagerProvider mode={offline({ policyRules: [rule] })}>
```

Code that passed `policyRules` to the provider now fails type checking.
Its behavior does not change, because the option never had an effect.
