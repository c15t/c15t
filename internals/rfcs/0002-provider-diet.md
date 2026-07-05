# RFC 0002: Provider Diet — Lazy Transports & Lazy Translation Fallback

Status: **Parked — well-specified follow-up.** Pick up when the slim/banner-only
entry is built (the design work pays twice there). Not urgent: expected win is
~5% of the headline bundle number; the high-leverage optimizations are shipped.

## Problem

The React v3 provider's eager path is 45KB min / **14.8KB gz** and contains no
waste — only reachable features (measured via esbuild `--splitting` metafile;
see `v3.md` § Provider anatomy). Two of those features are paid for by apps
that never use them:

| bytes (min) | what | who pays unnecessarily |
|---:|---|---|
| ~11KB | offline transport → `@c15t/schema` resolver chunk | every hosted-mode app (the default) |
| ~4.5KB | baked-in English translation bundle | every app whose translations come from prefetch/manifest/init (all recommended paths) |

Tree-shaking cannot remove them: the provider *runtime-supports* three
transport modes, so the code is reachable. `sideEffects: false` is already set
on `c15t` (shipped) and removes nothing here. Removing reachable features
requires an API change.

## Design

### 1. Kernel: `attachTransport(transport)`

Today the transport is bound at `createConsentKernel({ transport })` only.
Add late binding:

- `kernel.attachTransport(t)` — idempotent-ish (last write wins before init;
  attaching after a successful `init()` is a no-op + dev warning).
- **Command semantics before attach (the contract change):** `commands.init()`
  and `commands.save()` issued while no transport is attached **queue** (FIFO,
  bounded) and flush on attach. Today they resolve as no-ops; queuing preserves
  the "provider mounts → init fires" mental model when the transport arrives a
  microtask later via dynamic import.
- **Spec-first:** extend `internals/conformance` with the
  commands-before-transport area *before* implementing (queue flush order,
  double-attach, save-before-init-before-attach). All four framework drivers
  must stay green.

### 2. Provider: transport per `options.mode`, dynamically imported

- `hosted` (default): stays statically imported — it is small and dominant.
- `offline` / custom-manifest: `import('c15t/v3/transports/offline')` inside
  the provider setup effect → `kernel.attachTransport(...)`. The offline
  transport's schema-resolver dependency leaves the eager graph.
- Requires per-transport subpath exports (`c15t/v3/transports/*`) so the
  chunks split; root `c15t/v3` keeps re-exporting for compat.

### 3. Lazy English fallback

`defaultTranslationConfig` (the full `en` bundle) is imported statically by
`provider.tsx` for three fallback sites. Change: resolve translations from
options/prefetch/init first; only when absent, dynamically import the bundle
and `kernel.set` it. SSR/manifest/prefetch paths never load the chunk.
Guard: the banner must not render translation-keyed empty strings while the
fallback loads (gate on `translations != null`, which is already the snapshot
shape).

## Expected impact (measured basis, not aspiration)

Eager path 45 → ~30KB min (**14.8 → ~10.5KB gz, ≈-30%**); ~5% off the
headline route addition (93KB gz). Roughly 10–15ms less parse/compile on a
mid-tier phone. Verify via: the esbuild metafile harness (checked into
scripts if needed), `bundle-test-app` route analysis, and a react-browser-bench
A/B run — expect bundle deltas to be visible and timing deltas to be noise.

## Order of work

1. Conformance spec: commands-before-transport area (all drivers green)
2. Kernel: `attachTransport` + queue + tests
3. Core: `c15t/v3/transports/*` subpath exports
4. Provider: mode-driven dynamic transport + lazy translation fallback
5. Measure (metafile + bundle app + bench A/B); update `v3.md` numbers

## Non-goals

- Slimming persistence (v2-compat storage format is the no-re-prompt
  guarantee; 8KB well spent)
- Any change to hosted-mode eager behavior
- The slim/banner-only entry itself (separate work; shares step 3)
