---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Follow a replacement runtime in `ConsentProvider`

Passing `ConsentProvider` a different `runtime` switches hooks and
`KernelContext` consumers to it. Before, the provider kept rendering the first
runtime. It still disposes neither runtime.

An open preference UI discards the draft staged against the old runtime and
starts from the new runtime's record. A draft handle or `useIAB()` result kept
from before the switch no longer saves. Draft `save()` resolves
`{ ok: false }`, IAB `save()` rejects with an `AbortError`, and setters do
nothing. IAB actions pending when `IABProvider` unmounts also reject with an
`AbortError` instead of never settling. Moving between a borrowed runtime and
one the provider creates still requires a remount.
