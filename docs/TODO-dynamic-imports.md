# TODO: Dynamic Imports for Consent Components

> **Status:** Future optimization
> **Created:** 2026-02-12
> **Package:** `@c15t/nextjs`, `@c15t/react`

## Context

Investigated whether `@c15t/nextjs` should switch from streaming an unresolved promise to the client to awaiting on the server with Suspense + dynamic component loading.

**Conclusion: Keep promise streaming for data fetching. Add dynamic imports for heavy components.**

## Why Streaming Beats Await + Suspense

All consent components (banner, dialog) are **client-only** — they use `createPortal` and an `isMounted` guard, so they never render HTML on the server. This means:

- Suspense boundaries provide zero visible loading benefit
- Awaiting on the server just delays TTFB by 50-200ms for no SSR gain
- The promise typically resolves during or before hydration anyway

## The Real Optimization: Code Splitting

Currently all consent components are bundled together. A user in the US (opt-out model) downloads the entire IAB dialog code (~1000+ lines) they'll never use.

### Phase 1: Lazy wrappers for IAB components (high impact)

Create lazy wrappers with `React.lazy()` + `Suspense fallback={null}`:

- `packages/react/src/components/iab-consent-banner/lazy.tsx`
- `packages/react/src/components/iab-consent-dialog/lazy.tsx`

Export as `IABConsentBannerLazy` and `IABConsentDialogLazy` from `@c15t/react`.

### Phase 2: Smart lazy for ConsentDialog (medium impact)

The dialog only appears when a user clicks "Customize". It should gate the dynamic import on `activeUI !== 'dialog'` so the chunk never loads unless needed.

- `packages/react/src/components/consent-dialog/lazy.tsx`

### Phase 3: Chunk preloading after init (nice-to-have)

After `/init` resolves and we know the consent model, preload the appropriate component chunk so it's ready instantly when `activeUI` changes.

### What NOT to change

- Don't await `fetchInitialData` on the server
- Don't add Suspense around `ConsentManagerProvider`
- Don't lazy-load `ConsentBanner` (it's the first UI shown, needs to render immediately)

## Files to modify

| File | Change |
|------|--------|
| `packages/react/src/components/iab-consent-banner/lazy.tsx` | New - lazy wrapper |
| `packages/react/src/components/iab-consent-dialog/lazy.tsx` | New - lazy wrapper |
| `packages/react/src/components/consent-dialog/lazy.tsx` | New - smart lazy wrapper |
| `packages/react/src/index.ts` | Add lazy component exports |

## Verification

1. Bundle analysis: compare chunk sizes before/after
2. Functionality: banner appears immediately, dialog opens on click, IAB loads in IAB jurisdiction
3. Network tab: lazy chunks only load when needed
4. Tests: `bun test` in `packages/react` passes unchanged
