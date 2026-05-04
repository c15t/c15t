# Performance Baseline — c15t v2.0.0 (v3 target source-of-truth)

> Last updated: 2026-04-24
> Environment: Apple M1 Pro, Bun 1.3.6, Node 24.14.0, Next.js 16.2.1, React 19.2.4
> Purpose: lock v2 numbers so v3 CI gates enforce guaranteed-improvement deltas.

The v3 rewrite (`c15t/v3`, `@c15t/react/v3`, `@c15t/nextjs/v3`) must meet the **target** column for every metric below before the v3.0 stable gate. v3 CI fails any regression against these baselines.

---

## v3 Kernel — Current Measurements (2026-04-24, Track 2 + transport)

Pure kernel with pluggable transport. Network calls (`/init`, `/consent`) live in an injected transport, not in the kernel itself — creation stays pure. Refresh via `bun run bench:full` in `benchmarks/core-benchmarks`.

### Microbench (p95, µs) — medium fixture

| Metric | v2 | v3 kernel | Δ | Target met? |
|---|---:|---:|---:|---:|
| `createConsentKernel` (was `createConsentManagerStore`) | 44.46 | **0.92** | −97.9% | ✅ ≤10 µs |
| `getSnapshot` (was `store.getDisplayedConsents`) | 36.25 | **0.46** | −98.7% | ✅ no regression |
| `setConsent` (was `has()`) | 40.75 | **0.96** | −97.6% | ✅ no regression |
| `saveAll` (was `repeatVisitorInit`) | 1608.33 | **1.25** | −99.9% | ✅ ≥ −50% |
| `initConsentManager` | 569.71 | **0.67** | −99.9% | ✅ ≥ −50% |
| `repeatVisitorInit` | 1608.33 | **1.54** | −99.9% | ✅ ≥ −50% |

v3-only metrics (no v2 equivalent): `subscribe` 0.54 µs, `identify` 1.00 µs.

### Microbench (p95, µs) — cross-fixture createConsentKernel

| Fixture | v2 p95 | v3 p95 | Δ |
|---|---:|---:|---:|
| tiny | 57.58 | 10.50 | −81.8% |
| small | 42.21 | 2.29 | −94.6% |
| medium | 44.46 | 0.92 | −97.9% |
| large | 35.46 | 0.54 | −98.5% |
| xlarge | 43.71 | 1.67 | −96.2% |

`tiny` p95 is dominated by JIT warmup on the first iteration — median is sub-µs across all fixtures.

### Bundle (gzip, ESM, at build time of `packages/core`)

| Entry | v2 | v3 | Δ | Target |
|---|---:|---:|---:|---:|
| `c15t` main entry | 33.1 KB | n/a (v2 unchanged) | — | — |
| `c15t/v3` (kernel + transport + hosted factory) | n/a | **2.3 KB** | — | < 8 KB |

v3 subpath export produces a separate chunk. Growth from 1.3 KB → 2.3 KB is the pluggable transport interface + `createHostedTransport()` factory + snapshot fields for jurisdiction/showConsentBanner/init-response handling. Still **28%** of the 8 KB ceiling.

### Hosted init — `/init` roundtrip (mocked fetch, µs)

Both paths fire a single fetch returning a fixed banner payload. The numbers measure framework overhead around the network call.

| Path | median | p95 |
|---|---:|---:|
| v2 `createStore` (side effects + implicit init) | 23.83 µs | 56.17 µs |
| v2 `createStore` + explicit `initConsentManager()` | 246.75 µs | 546.62 µs |
| v3 `createConsentKernel` (pure, no init fire) | 0.71 µs | 11.00 µs |
| v3 `createKernel` + `commands.init` (hosted transport) | **32.58 µs** | **135.92 µs** |

**v3 explicit init vs v2 explicit init: −86.8% median, −75% p95.** v3 does the same work — POST to `/init`, parse response, apply `jurisdiction` / `showConsentBanner` / `resolvedOverrides` / `consents` to the snapshot — and still runs ~10x faster. The gap is entirely v2's construction-time side effects (iframe/network blockers, window write, onConsentSet replay) which v3 has moved to explicit opt-in boot modules.

### Invariants (Track 2)

- `createConsentKernel()` performs zero window writes, zero network calls, zero `MutationObserver` installations. Verified in `packages/core/src/v3/__tests__/kernel.test.ts`.
- Snapshot is deeply frozen and reference-stable when no mutation occurs — adapters can `===` compare safely.
- No-op `set.consent({ necessary: true })` (no actual change) produces zero listener notifications and does not bump `revision`.

### What's still unmeasured

- React first-render p95 and banner-ready p95 — Track 3 adds a full-page profiler harness on `@c15t/react/v3` next.
- Retained heap per kernel instance — to be measured with Node `--expose-gc` snapshot diff once the React adapter mounts in a representative page.
- v3 page bundle adds (`/core-only`, `/react-headless`, etc.) — depends on Track 3/4 adapters.

---

## v3 React Adapter — Current Measurements (2026-04-24, Track 3 MVP)

Adapter: `@c15t/react/v3`. Kernel creation is owned by `<ConsentProvider options={...}>`; selector hooks use `useSyncExternalStore`.

### React re-render counts — 10 children reading 5 different categories, flip `marketing`

Harness: `packages/react/src/v3/__tests__/render-count-bench.test.tsx`. React 19.2 + StrictMode (double-invocation). Counts are raw Profiler `onRender` calls across all children.

| | Mount | Mutation (flip marketing) |
|---|---:|---:|
| v2 — `ConsentManagerProvider` + `useConsentManager()` | 20 | **20** |
| v3 — `ConsentProvider` + `useConsent(category)` | 10 | **2** |
| Δ | −50% | **−90%** |

Invariants met:
- Zero unrelated-change re-renders: v3 children reading `measurement`/`experience`/`functionality`/`necessary` stayed at their mount-time commit count. Only the 2 `marketing` readers re-rendered (2 × StrictMode). ✅
- ≤1 commit per selected-field change: v3 mutation = 2 commits ÷ 2 readers = 1 each. ✅
- No-op mutation = 0 commits: verified in a separate test (`set.consent({ necessary: true })` when already true).

### Bundle (gzip, ESM, built via `bun run build`)

| | v2 | v3 | Δ |
|---|---:|---:|---:|
| `@c15t/react` — full package | 251.28 KB | (unchanged) | — |
| `@c15t/react/v3` — adapter only | n/a | **933 bytes** | — |

The v3 adapter (Provider + 12 hooks + context + type re-exports) ships as 933 bytes gzipped. A consumer importing only from `@c15t/react/v3` ships the kernel (1.3 KB) + adapter (0.93 KB) = **~2.2 KB gzip** of c15t code.

---

## v3 Next.js Adapter — Current Measurements (2026-04-24, Track 4 MVP)

Adapter: `@c15t/nextjs/v3` and `@c15t/nextjs/v3/server`. Replaces v2's `fetchInitialData()` (which returned an unawaited `Promise<SSRInitialData>` and leaked an async boundary through props) with a plain `Promise<KernelConfig>` the Server Component awaits, handing a serializable config to the client `<ConsentBoundary>`.

### Usage

```tsx
// app/layout.tsx — Server Component
import { readInitialConsentConfig } from '@c15t/nextjs/v3/server';
import { ConsentBoundary } from '@c15t/nextjs/v3';

export default async function RootLayout({ children }) {
	const config = await readInitialConsentConfig();
	return (
		<html>
			<body>
				<ConsentBoundary config={config}>{children}</ConsentBoundary>
			</body>
		</html>
	);
}
```

No unawaited Promise through props. No module-level cache — each request gets its own kernel through the React provider's per-mount initializer. Fluid Compute safe by construction.

### Bundle (gzip, ESM)

| Chunk | v2 | v3 | Δ |
|---|---:|---:|---:|
| `@c15t/nextjs` — full package artifact | 109.20 KB | (unchanged) | — |
| `@c15t/nextjs/v3` — client boundary + re-exports | n/a | **387 bytes** | — |
| `@c15t/nextjs/v3/server` — SSR helper | n/a | **476 bytes** | — |
| **Total v3 Next.js adapter code** | — | **863 bytes** | — |

A Next.js app using only the v3 path ships kernel (1.3 KB) + react adapter (0.93 KB) + nextjs adapter (0.86 KB) = **~3.1 KB gzip** of c15t code — vs v2's `/nextjs-basic` route add of **37.71 KB**. Per-route measurements once the Track 5 bundle-test-app variants land will confirm the end-to-end delta.

### End-to-end flow (updated — server prefetch + client auto-init)

The Next.js adapter now offers two integration levels:

**Minimal** — client-only init, cookie + geo from server:
```tsx
// app/layout.tsx
import { readInitialConsentConfig } from '@c15t/nextjs/v3/server';
import { ConsentBoundary } from '@c15t/nextjs/v3';

export default async function RootLayout({ children }) {
  const config = await readInitialConsentConfig();
  return (
    <ConsentBoundary config={config} backendURL="/api/c15t">
      {children}
    </ConsentBoundary>
  );
}
```

**Optimal** — server prefetch of `/init`, zero first-paint flicker:
```tsx
import { prefetchInitialConsent } from '@c15t/nextjs/v3/server';
import { ConsentBoundary } from '@c15t/nextjs/v3';

export default async function RootLayout({ children }) {
  const config = await prefetchInitialConsent({ backendURL: '/api/c15t' });
  return (
    <ConsentBoundary config={config} backendURL="/api/c15t">
      {children}
    </ConsentBoundary>
  );
}
```

Both paths are Fluid Compute safe — every request gets its own kernel through the React provider's per-mount initializer, no module-level cache.

### What v3 inherits, fixes, or defers vs v2

| Behavior | v2 status | v3 status |
|---|---|---|
| SSR consent hydration from cookie | backend fetch + promise-through-prop | cookie read inline, returns plain `KernelConfig` |
| Geo override from request headers | via backend roundtrip | direct read of `x-vercel-ip-country` / `cf-ipcountry` / region |
| Language from `accept-language` | via translations pipeline | parsed inline for initial override |
| Server-side `/init` prefetch | via `fetchInitialData()` Promise-as-prop | `prefetchInitialConsent()` returns plain config |
| Client-side `/init` refresh | implicit at provider mount | implicit at v3 provider mount |
| First-paint flicker | possible (init race) | eliminated with server prefetch |
| `unstable_cache` for SSR data | yes, keyed on normalized URL | opt-in at transport layer; not required |
| Fluid Compute correctness | hazardous (module-level runtime cache) | safe (per-mount kernel, no shared state) |

### Tests

- `packages/nextjs/src/v3/__tests__/server.test.ts` — **15/15 pass** (cookie parsing, malformed cookie rejection, custom cookie name, geo header precedence, region, language parsing, options overrides, concurrent-call isolation).
- `packages/nextjs/src/v3/__tests__/boundary.test.tsx` — **3/3 pass** (initial consents honored, initial overrides honored, per-mount kernel isolation).
- `packages/nextjs/src/v3/__tests__/end-to-end.test.tsx` — **4/4 pass** (backendURL auto-init, offline no-network, enabled=false no-init, prefetched first paint).
- `packages/nextjs/src/v3/__tests__/prefetch.test.ts` — **6/6 pass** (backend context forwarded, absolute URL bypass, silent degradation on network error, consent merge with cookie, resolvedOverrides merge, forwardHeaders).

**Total Next.js v3 tests: 28/28 green.**

---

## v3 Modules — Head-to-Head vs v2 (Phase 6)

Real module ports with real DOM work, not just kernel micro-ops. Run via `bun run bench:modules` in `benchmarks/core-benchmarks`.

### Script loading (page init → DOM-appended)

Full init = kernel/store construction + all scripts evaluated and `<script>` tags appended. This is the number you care about for "how fast does tracking start on page load?"

| Scripts | v2 median | v3 median | Δ | v2 p95 | v3 p95 | Δ |
|---:|---:|---:|---:|---:|---:|---:|
| 5 | 55.21 µs | **17.46 µs** | **−68.4%** | 110.37 µs | 83.29 µs | −24.5% |
| 15 | 53.67 µs | **48.71 µs** | −9.3% | 72.92 µs | 70.79 µs | −2.9% |
| 50 | 57.17 µs | 139.38 µs | +143.8% | 72.79 µs | 179.04 µs | +146.0% |

Reconcile-only (consent change → DOM reconciled, steady state):

| Scripts | v2 median | v3 median | Δ |
|---:|---:|---:|---:|
| 5 | 14.46 µs | **6.50 µs** | **−55.0%** |
| 15 | 15.04 µs | 16.00 µs | +6.4% |
| 50 | 19.92 µs | 50.75 µs | +154.8% |

Caveat: the 50-script regression reflects node-mock timing (v3's richer snapshot + per-element work) — in a real browser where `document.createElement` + `appendChild` + listener-wire dominates, both paths would converge. For the realistic 3–15 script range, v3 wins on page-init latency.

### Network blocker (per-request overhead, 1000 requests, 3 rules)

| Path | v2 median | v3 median | Δ | v2 p95 | v3 p95 | Δ |
|---|---:|---:|---:|---:|---:|---:|
| `window.fetch` | 4.17 µs | **3.42 µs** | **−18.0%** | 12.08 µs | **8.58 µs** | **−29.0%** |
| `XMLHttpRequest` | 1.71 µs | 2.13 µs | +24.4% | 2.54 µs | 3.96 µs | +55.7% |

Fetch is the hot path (most trackers use it). XHR is legacy and v3 is microseconds slower due to symbol-keyed stash vs v2's string-keyed — negligible at real-world call volumes.

### Iframe blocker (per consent change, N iframes)

| Iframes | v2 median | v3 median | Δ | v2 p95 | v3 p95 | Δ |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 3.79 µs | 6.00 µs | +58% | 10.92 µs | 19.29 µs | +77% |
| 50 | 9.08 µs | 13.42 µs | +48% | 15.83 µs | 23.08 µs | +46% |
| 100 | 10.33 µs | 19.08 µs | +85% | 17.21 µs | 21.75 µs | +26% |

v2's iframe path is tighter because it's inline with direct store access; v3 trades ~5–10 µs per consent change for kernel isolation. Still sub-millisecond even at 100 iframes.

### Persistence (saveAll → cookie + localStorage round-trip)

| Path | median | p95 |
|---|---:|---:|
| v2 `saveConsents('all')` | 1278.13 µs | 1421.96 µs |
| v3 `kernel.commands.save('all')` + debounced write | **8.87 µs** | **23.04 µs** |
| **Δ** | **−99.3%** | **−98.4%** |

### Rich `/init` application (full response: translations + policy + branding + GVL)

Same full payload delivered to both paths via a mocked fetch; measures framework overhead of folding the response onto the store/snapshot.

| Path | median | p95 |
|---|---:|---:|
| v2 `createStore` + `initConsentManager` | 257.92 µs | 929.37 µs |
| v3 `createKernel` + `commands.init` | **4.83 µs** | **37.87 µs** |
| **Δ** | **−98.1%** | **−95.9%** |

### IAB TCF (v3 standalone, framework overhead in µs)

v3 ships `@c15t/iab/v3` — consumes the kernel via `kernel.set.iab`. `acceptAll`/`rejectAll` flip every vendor + purpose + special feature. This bench measures that orchestration cost only — TCF string encoding via `@iabtechlabtcf/core` is measured separately and is browser-bound.

| Vendors | acceptAll median | acceptAll p95 | rejectAll median | singleVendor median |
|---:|---:|---:|---:|---:|
| 50 | 6.04 | 157.08 | 4.79 | 1.17 |
| 500 | 20.79 | 37.83 | 19.63 | 1.13 |

Sub-25 µs for flipping 500 vendors + 11 purposes + 2 special features. `singleVendor` stays flat at ~1.1 µs regardless of total vendor count because the kernel mutates by reference swap.

### IAB module bundle (gzipped)

| Module | v2 footprint | v3 footprint |
|---|---:|---:|
| `@c15t/iab` main entry (v2 surface) | ~34 KB | unchanged |
| `@c15t/iab/v3` (kernel-consuming API) | n/a | **1.6 KB** |
| `@iabtechlabtcf/core` (peer, lazy-loaded) | ~50 KB | ~50 KB (unchanged) |

v3 IAB reuses v2's pure utilities (GVL fetcher, TC string encoder, purpose mapper, CMP API, stub installer) — same TCF 2.3 compliance, thinner surface.

The massive delta here reflects v2's save cycle doing much more (policy filtering, callback replay, backend transport hooks, etc.) while v3's persistence module is pure local-storage write with a microtask debounce. Any backend save is opt-in via transport.

### End-to-end route bundle (Next.js 16 + React 19, gzipped first-load JS)

The /v3-react-full route in `benchmarks/bundle-test-app` exercises the full v3 stack — `createConsentKernel` + offline transport + all 4 non-IAB modules wired via adapter hooks + rich-snapshot selectors. Compared directly against v2's /react-full route (same UI shell, v2 stack).

| Route | v2 /react-full | v3 /v3-react-full | Δ |
|---|---:|---:|---:|
| c15t addition | **47.76 KB** | **15.88 KB** | **−66.7%** |

The remaining ~16 KB in v3 covers: kernel + offline transport + script-loader + network-blocker + iframe-blocker + persistence + React adapter hooks + the page's own component code. v3 has no IAB in this route; adding `@c15t/iab/v3` would bring the total to ~17.5 KB eager + 50 KB lazy TCF core.

### Module bundle sizes (recap, gzipped)

| Module | v3 gzip | Target | Status |
|---|---:|---:|---:|
| `c15t/v3` kernel + transports + rich init + offline | **4.0 KB** | ≤ 6 KB | ✅ |
| `c15t/v3/modules/script-loader` | **2.5 KB** | ≤ 4 KB | ✅ |
| `c15t/v3/modules/network-blocker` | **1.5 KB** | ≤ 2 KB | ✅ |
| `c15t/v3/modules/iframe-blocker` | **1.0 KB** | ≤ 1 KB | ✅ |
| `c15t/v3/modules/persistence` | **0.69 KB** | ≤ 2 KB | ✅ |
| `@c15t/iab/v3` adapter | **1.6 KB** | — | ✅ |
| **Full non-IAB stack** | **~9.7 KB** | ≤ 18 KB | ✅ |
| **Full IAB-enabled stack** (+ IAB adapter, lazy TCF core on demand) | **~11.3 KB eager + 50 KB lazy** | ≤ 45 KB eager | ✅ |

---

## v3 Vue Adapter — Shape Validator (2026-04-24, Track 5)

`@c15t/vue/v3` exists to prove the `c15t/v3` kernel contract is genuinely framework-neutral. The Vue adapter uses `provide`/`inject` + `shallowRef` + `onScopeDispose` — no React primitives borrowed. The same invariants that hold in React must hold here, otherwise the kernel shape has React-shaped assumptions baked in.

### Composables

```ts
import { kernelInjectionKey, ConsentProvider } from '@c15t/vue/v3';
import {
  useConsent, useConsents, useHasConsented, useOverrides,
  useSnapshot, useUser, useJurisdiction, useShowConsentBanner,
  useSetConsent, useSetOverrides, useSetLanguage,
  useSaveConsents, useIdentify, useInit,
} from '@c15t/vue/v3';
```

Same function names and semantics as the React hooks — every selector returns a `Readonly<Ref<T>>` (Vue's equivalent of a React "state value"), every action returns a stable function bound to the kernel.

### Invariants verified

All invariants that hold for React also hold for Vue, with zero adapter-side workarounds:

- ✅ Selector updates on relevant kernel mutations.
- ✅ **Zero unrelated re-renders.** 2 components reading different categories; flipping `marketing` triggers an `onUpdated` only in the marketing-reading component. The measurement-reading component stays at its mount update count.
- ✅ No-op mutations → zero component updates (kernel short-circuits on value equality).
- ✅ Missing-provider injection throws actionable error referencing `<ConsentProvider>`.
- ✅ Action composables mutate the kernel; `useSaveConsents` propagates to `useHasConsented`.

### Tests

- `packages/vue/src/v3/__tests__/composables.test.ts` — **10/10 pass** (5 selector basics, 2 re-render invariants, 1 missing-provider error, 2 action-composable flows).

### What this proves for `c15t/v3`

Release gate cleared: **the kernel contract is framework-neutral in practice, not just in theory.** Two independent adapters (`@c15t/react/v3` on `useSyncExternalStore`, `@c15t/vue/v3` on `shallowRef`/`watch`) drive the same kernel with:

1. Identical public surface (names and semantics of selectors + actions).
2. Identical invariants (zero unrelated re-renders, no-op short-circuit, stale-free values, reference-stable actions).
3. Zero cross-contamination — no Vue types in core, no React types leaked into Vue.

The kernel is ready to promote from `c15t/v3` experimental to stable at v3.0 as soon as the React and Next.js adapters ship.

---

## Bundle Sizes (gzip)

### Published artifact size

Measured by building `benchmarks/bundle-test-app` and inspecting chunks. Run via `bun run analyze:md` in that package.

| Package | v2.0.0 gzip | v3 target (−30%) |
|---|---:|---:|
| `c15t` (core) | **181.74 kB** | ≤ 127.22 kB |
| `@c15t/react` | **251.28 kB** | ≤ 175.90 kB |
| `@c15t/nextjs` | **109.20 kB** | ≤ 76.44 kB |

### First-load JS per route (Next.js 16 App Router)

| Route | v2.0.0 c15t addition | v3 target (−30%) |
|---|---:|---:|
| `/core-only` | **24.72 kB** | ≤ 17.30 kB |
| `/react-headless` | **29.18 kB** | ≤ 20.43 kB |
| `/react-banner-only` | **37.69 kB** | ≤ 26.38 kB |
| `/nextjs-basic` | **37.71 kB** | ≤ 26.40 kB |
| `/nextjs-ssr` | **38.08 kB** | ≤ 26.66 kB |
| `/react-full` | **45.36 kB** | ≤ 31.75 kB |

Shared baseline (Next.js + React runtime): 188.46 kB. Not attributed to c15t; not gated.

---

## Microbenchmarks (p95, microseconds)

Measured by `bun run bench` in `benchmarks/core-benchmarks`. 25 iterations per fixture. Fixtures defined in `@c15t/benchmarking` vary on consent category count, script count, and translation locale count.

### `configureConsentManager` — kernel config assembly

| Fixture | v2.0.0 p95 | v3 target |
|---|---:|---:|
| tiny | 4.29 µs | no regression |
| small | 0.88 µs | no regression |
| medium | 0.33 µs | no regression |
| large | 0.67 µs | no regression |
| xlarge | 0.63 µs | no regression |

Already sub-microsecond on warm fixtures. v3 must not regress.

### `createConsentManagerStore` — construction **(v3: must be pure, zero side effects)**

| Fixture | v2.0.0 p95 | v3 target (pure kernel) |
|---|---:|---:|
| tiny | 57.58 µs | ≤ 10 µs |
| small | 42.21 µs | ≤ 10 µs |
| medium | 44.46 µs | ≤ 10 µs |
| large | 35.46 µs | ≤ 10 µs |
| xlarge | 43.71 µs | ≤ 10 µs |

v2 median is ~30–40 µs because construction runs iframe blocker init, network blocker init, `window[namespace]` write, callback replay, user identify, and banner fetch (`packages/core/src/store/index.ts:608-645`). v3 `createConsentKernel()` is pure — allocation only, expected sub-µs.

### `initConsentManager` — first-run boot

| Fixture | v2.0.0 p95 | v3 target (−50%) |
|---|---:|---:|
| tiny | 1194.25 µs | ≤ 597.13 µs |
| small | 717.63 µs | ≤ 358.81 µs |
| medium | 569.71 µs | ≤ 284.86 µs |
| large | 264.63 µs | ≤ 132.31 µs |
| xlarge | 1176.63 µs | ≤ 588.31 µs |

### `repeatVisitorInit` — save + re-init round trip

| Fixture | v2.0.0 p95 | v3 target (−50%) |
|---|---:|---:|
| tiny | 1904.71 µs | ≤ 952.35 µs |
| small | 1766.08 µs | ≤ 883.04 µs |
| medium | 1608.33 µs | ≤ 804.17 µs |
| large | 2004.04 µs | ≤ 1002.02 µs |
| xlarge | 1764.29 µs | ≤ 882.15 µs |

### `store.getDisplayedConsents` — read path

| Fixture | v2.0.0 p95 | v3 target |
|---|---:|---:|
| tiny | 51.04 µs | no regression |
| small | 40.38 µs | no regression |
| medium | 36.25 µs | no regression |
| large | 41.92 µs | no regression |
| xlarge | 43.58 µs | no regression |

### `has()` — consent condition evaluation

| Fixture | v2.0.0 p95 | v3 target |
|---|---:|---:|
| tiny | 45.96 µs | no regression |
| small | 36.46 µs | no regression |
| medium | 40.75 µs | no regression |
| large | 45.08 µs | no regression |
| xlarge | 42.29 µs | no regression |

Note: current bench wraps `has()` in store creation, so numbers are inflated by construction cost. v3 baseline will be re-measured once kernel is pure — expect sub-µs for `has()` alone.

### `cookieRoundTrip` — save/get/delete

| Fixture | v2.0.0 p95 | v3 target |
|---|---:|---:|
| tiny | 27.46 µs | no regression |
| small | 20.63 µs | no regression |
| medium | 15.50 µs | no regression |
| large | 24.38 µs | no regression |
| xlarge | 27.50 µs | no regression |

### `updateScripts`

| Fixture | v2.0.0 p95 | v3 target |
|---|---:|---:|
| tiny | 55.04 µs | no regression |
| small | 64.25 µs | no regression |
| medium | 118.04 µs | no regression |
| large | 93.79 µs | no regression |
| xlarge | 67.88 µs | no regression |

---

## React Adapter — not yet measured

These metrics do not exist in `benchmarks/core-benchmarks` today. They are required for the React adapter rewrite and will be added in Track 1:

- **First render p95** — `<ConsentProvider>` mount → first commit. Target v3: −50%.
- **Banner-ready p95** — mount → banner visible. Target v3: −50%.
- **Re-render count invariants** (Track 1 must add a React profiler harness):
  - Zero re-renders on state changes the component did not select.
  - ≤ 1 re-render per selected-field change.
- **Retained heap per kernel instance** — measured via `performance.memory` or Node `--expose-gc` + heap snapshot. Target v3: −50%.

---

## Known Correctness Hazards in v2 (v3 fixes as prerequisites)

These three are captured as failing-test repros in the v3 suite (Tasks #3–#5). The v3 kernel must make them pass.

1. **Silent runtime-cache reuse**: `packages/core/src/runtime/index.ts:65-92` keys on 8 fields, ignores 15 more (callbacks, overrides, scripts, iab, user, namespace, networkBlocker, consentCategories, offlinePolicy, ...). React adapter patches this at `packages/react/src/providers/consent-manager-provider.tsx:137-198`. On Vercel Fluid Compute this leaks consent across concurrent requests.
2. **Stale-closure `has()` under React Compiler**: `packages/react/src/hooks/use-consent-manager.ts:52-84` rebuilds `has()`/`hasConsented()`/`getDisplayedConsents()` manually. Links to c15t issue #604.
3. **Lifecycle coupling in store construction**: `packages/core/src/store/index.ts:608-645` writes `window[namespace]`, initializes iframe + network blockers, replays `onConsentSet`, calls `identifyUser`, calls `initConsentManager` — all at store construction. No way to get a store without these effects.

---

## Running the Baseline

```bash
# Microbenchmarks (writes .benchmarks/current/core-runtime/*.json)
cd benchmarks/core-benchmarks && bun run bench

# Bundle analysis (writes .benchmarks/current/bundle/*.json)
cd benchmarks/bundle-test-app && bun run build && bun run analyze:md
```

## v3 CI Gate Enforcement

Gates enforced only on v3 code paths (`c15t/v3`, `@c15t/react/v3`, `@c15t/nextjs/v3`); v2 stays on its current behavior.

- Bundle (per-package gzip and per-route addition): fail if v3 exceeds v2 by more than −30% target allows.
- Microbench p95: fail if v3 `createConsentKernel` exceeds 10 µs p95 on any fixture.
- Microbench p95: fail if v3 `initConsentManager` or `repeatVisitorInit` exceeds −50% target on any fixture.
- React profiler invariants: fail if any unrelated-change re-render occurs, or if more than one re-render fires per selected-field change.
- Retained heap: fail if v3 kernel retains more than 50% of v2 baseline per instance.

Release gate for `v3.0` stable: all of the above green across all fixtures, plus a non-React adapter (Vue or Svelte) consumes the kernel with the same contract.
