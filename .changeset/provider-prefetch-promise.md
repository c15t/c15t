---
'@c15t/react': minor
'@c15t/core': minor
---

`ConsentProvider` accepts `prefetch` as a pending `Promise<KernelConfig>`, so a Next.js layout can pass `prefetchInitialConsent(...)` without awaiting it. The provider mounts with a provisional policy, children render (and the static shell prerenders) while the consent data streams in, and the first `init()` applies the resolved config in place of the transport's network init. A config without a policy (persisted consents, geo, language) is applied to the kernel and the transport init runs as usual; a rejected promise falls through to the transport init. The resolved `KernelConfig` form is unchanged.

`@c15t/core` adds `kernelConfigToInitResponse()`, the inverse of `mergeInitResponseIntoKernelConfig()`, which lifts a prefetched config back into an `InitResponse` (or `undefined` when it carries no policy).
