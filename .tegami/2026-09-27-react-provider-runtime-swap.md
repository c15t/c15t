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
