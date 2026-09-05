---
'@c15t/core': major
---

Require the versioned `policyResolution` contract in hosted, manifest and custom initialization. Requests send `x-c15t-policy-contract: 1`; unsupported contracts and unversioned legacy producers fail safely. Remove old init `policy`/`policyDecision` projections, consent booleans as draft input, and offline `policyPacks` configuration. Configure offline behavior with `policyRules`. Pass a canonical `KernelTransport` to `custom()`; endpoint handlers using `setConsent` and `identifyUser` are removed.

Send confirmed category receipts with their original timestamps and derive preferences from explicit receipts, never masked permissions. A save payload without confirmation metadata is unsupported. Subject reads hydrate canonical records while retaining read-only decoding for stored v2 grants and receipts.

Identifying before a server subject exists resolves locally and sends no request. The next explicit save carries the identity; standing directives are forwarded after a real subject is established. Privacy requests use the privacy-directive endpoint, and successful server persistence is not implied before acknowledgement.

Deploy compatible producers and clients together. Cached old clients can retain stored grants under GPC even against the new backend, so invalidate or redeploy them before relying on v3 semantics. External hosted producer deployment is a separate release step.
