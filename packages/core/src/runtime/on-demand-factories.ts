/**
 * `@c15t/core/runtime/on-demand-factories` — each on-demand runtime module
 * factory on its own, for a host that imports some modules statically and
 * loads the rest on demand.
 *
 * `onDemandRuntimeModules` (from `@c15t/core/runtime/on-demand`) loads the
 * script loader and the network blocker as one chunk. A host that imports
 * one of them statically takes the other's factory from here instead:
 * `scriptLoaderOnDemand` and `networkBlockerOnDemand` each load a chunk
 * with only their module, because a chunk that also held the statically
 * imported module would make the bundler move that module into a chunk of
 * its own.
 *
 * A separate entry, not part of `@c15t/core/runtime/on-demand`: esbuild
 * emits a chunk for every `import()` in a file it reaches, used or not, so
 * the single-module chunks next to the shared one would split both modules
 * out of it, and a page would fetch the shared chunk and then each module
 * in a second round.
 *
 * @example
 * ```ts
 * import { createScriptLoader } from '@c15t/core/modules/script-loader';
 * import { networkBlockerOnDemand } from '@c15t/core/runtime/on-demand-factories';
 * ```
 */
// oxlint-disable-next-line oxc/no-barrel-file -- One module per factory, each with one import().
export * from './on-demand-clear-on-revocation';
// oxlint-disable-next-line oxc/no-barrel-file -- One module.
export * from './on-demand-consent-source';
// oxlint-disable-next-line oxc/no-barrel-file -- One module.
export * from './on-demand-network-blocker';
// oxlint-disable-next-line oxc/no-barrel-file -- One module.
export * from './on-demand-script-loader';
