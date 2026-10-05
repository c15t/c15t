/**
 * `@c15t/core/runtime/on-demand` — runtime modules that load on demand
 * (`onDemandRuntimeModules`), the configure-once runtime that mounts a
 * host's chosen modules (`createConsentRuntimeWith`) and `mountRuntimeIAB`.
 *
 * A separate entry from `@c15t/core/runtime/provider`. esbuild emits a
 * chunk for every `import()` in a file it reaches, used or not, and splits
 * a module two such chunks share into a chunk of its own. A React provider
 * that loads its modules through its own `import()`s would otherwise get
 * this entry's unused chunks, plus a facade chunk for each module it does
 * load. A configure-once host (the `@c15t/browser` ESM build, an Astro
 * page) would get the provider runtime's update and streamed-prefetch
 * chunks, which only a provider loads.
 *
 * @example
 * ```ts
 * import {
 *   createConsentRuntimeWith,
 *   onDemandRuntimeModules,
 * } from '@c15t/core/runtime/on-demand';
 * ```
 */
// Star exports, so a bundle that never reads a module leaves it, and the
// tools it imports, out.
// oxlint-disable-next-line oxc/no-barrel-file -- The entry: three small modules.
export * from './on-demand-modules';
// oxlint-disable-next-line oxc/no-barrel-file -- The entry.
export * from './runtime-with-modules';
// oxlint-disable-next-line oxc/no-barrel-file -- The entry.
export * from './iab-mount';
