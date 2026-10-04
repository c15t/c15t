/**
 * `@c15t/core/runtime/provider` — what a framework provider needs to build
 * its runtime, and nothing else.
 *
 * `@c15t/core/runtime` also exports `defaultRuntimeModules`, which imports
 * the script loader, iframe blocker and persistence statically. A bundler
 * drops those imports when nothing reads the object, but not every bundler
 * keeps them out of the first-load chunk: esbuild's code splitting, for
 * one, puts a module that is both imported statically (even unused) and
 * through `import()` into a chunk the entry loads. A provider that loads
 * those modules on demand imports from here instead:
 * `onDemandRuntimeModules` loads the script loader, the network blocker,
 * data clearing and a `consentSource` connection each as one chunk, only
 * when the page configures them. `lazyStreamPrefetch` likewise loads the
 * streamed-prefetch code only for a runtime whose `prefetch` is a promise;
 * `streamPrefetchWith` wraps a resolver the host imported itself.
 *
 * @example
 * ```ts
 * import {
 *   createConsentProviderRuntime,
 *   lazyRuntimeModule,
 * } from '@c15t/core/runtime/provider';
 * ```
 */
export { lazyRuntimeModule } from './lazy-module';
// A star export, so a bundle that never reads these leaves the module, and
// the tools it imports, out: esbuild puts a named re-export's module in
// every chunk that imports this entry.
// oxlint-disable-next-line oxc/no-barrel-file -- One module; the count is its tools' first-load imports, which the entry already has.
export * from './on-demand';
export { createConsentProviderRuntime } from './provider-runtime';
export { lazyStreamPrefetch, streamPrefetchWith } from './stream-mode';
export type { ResolveStreamedInit } from './stream-mode';
export type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeUpdate,
	RuntimePrefetch,
} from './types';
