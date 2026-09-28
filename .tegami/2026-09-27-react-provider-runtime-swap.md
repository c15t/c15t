---
packages:
  '@c15t/react': patch
---

### Follow a replacement runtime in `ConsentProvider`

When you pass `ConsentProvider` a different `runtime`, the provider now
switches to it. Hooks and `KernelContext` consumers unsubscribe from the
previous runtime's kernel and read the new one. Previously the provider kept
rendering the first runtime it received, so consumers could show that
runtime's consent after you replaced it. The provider still leaves both
runtimes to their owner and disposes neither.

An open preference UI switches too. `ConsentDraftProvider`,
`useConsentDraft()` and `useVendorDraft()` discard the draft staged against
the previous runtime and start a new one from the new runtime's record, so a
save only records into the new runtime. A draft inherited from an outer
`ConsentDraftProvider` is only shared while both providers use the same
runtime, so a nested provider on another runtime keeps its own.

`IABProvider` stops exposing the previous runtime's handle. An IAB action
taken right after the switch waits for the new runtime's handle, including
when you switch back to a runtime the provider rendered before. An action
still addressed to the previous runtime rejects with an `AbortError` and is
not applied to either runtime. Actions still waiting when `IABProvider`
unmounts, for example because its CMP failed to start, also reject with an
`AbortError` instead of never settling. Moving between a borrowed runtime and one the
provider creates still requires a remount.
