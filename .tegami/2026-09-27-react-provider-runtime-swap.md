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
save only records into the new runtime. `IABProvider` stops exposing the
previous runtime's handle. Queued IAB actions for the previous runtime reject
with an `AbortError`. Moving between a borrowed runtime and one the provider
creates still requires a remount.
