---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Remove the unused `policyRules` option from `ConsentManagerProvider`

`ConsentManagerOptions` no longer accepts `policyRules`. No Svelte transport
read it, so rules passed there were ignored. Code that passed it fails type
checking, with no change in behavior. Pass rules to the transport instead:

```svelte
<ConsentManagerProvider mode={offline({ policyRules: [rule] })}>
```
