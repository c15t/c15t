---
packages:
  "@c15t/cli": patch
---

### Stream consent in the generated Next.js App Router wrapper

With `--ssr` (or "Enable SSR consent prefetch"), `c15t setup` generated an async `ConsentManager` that awaited `resolveConsent` before rendering anything inside it. The layout wraps the whole page in that component, so every response waited for the consent backend's `/init` round trip before its first byte.

The generated `ConsentManager` is now synchronous. It starts `resolveConsent` and passes the pending result to the client provider, which applies it when it arrives. Pages render without waiting for the backend; the banner mounts after hydration. The generated provider's `state` prop accepts either the promise or a resolved state.

To keep the banner in the server HTML, make `ConsentManager` async, await `resolveConsent`, and wrap it in `<Suspense>` in the layout. The page then waits for consent. Existing generated files are not changed.
