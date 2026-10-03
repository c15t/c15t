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
 * those modules on demand imports from here instead. Its
 * `lazyStreamPrefetch` likewise loads the streamed-prefetch code only for a
 * runtime whose `prefetch` is a promise.
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
export { createConsentProviderRuntime } from './provider-runtime';
export { lazyStreamPrefetch } from './stream-mode';
export type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeUpdate,
	RuntimePrefetch,
} from './types';
