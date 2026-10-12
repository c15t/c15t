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
 * those modules on demand imports from here instead, and passes its own
 * `lazyRuntimeModule` factories or `onDemandRuntimeModules` from
 * `@c15t/core/runtime/on-demand`. `lazyStreamPrefetch` loads the
 * streamed-prefetch code only for a runtime whose `prefetch` is a promise;
 * `streamPrefetchWith` wraps a resolver the host imported itself.
 *
 * This entry reaches no `import()` but the provider runtime's own (its
 * update and streamed-prefetch code): esbuild emits a chunk for every
 * `import()` in a file it reaches, used or not, so the on-demand modules
 * and the configure-once runtime live in `@c15t/core/runtime/on-demand`.
 *
 * @example
 * ```ts
 * import {
 *   createConsentProviderRuntime,
 *   lazyRuntimeModule,
 * } from '@c15t/core/runtime/provider';
 * ```
 */
export { claimEarlyJourney } from '../libs/journey';
export { lazyRuntimeModule } from './lazy-module';
export { createConsentProviderRuntime } from './provider-runtime';
export { lazyStreamPrefetch, streamPrefetchWith } from './stream-mode';
export { readHostedMode } from '../transports/hosted-modes';
export { earlyInitModes } from '../transports/early-init-modes';
export type { EarlyInitMode } from '../transports/early-init-modes';
export type { ResolveStreamedInit } from './stream-mode';
export type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeUpdate,
	RuntimePrefetch,
	StreamedPrefetch,
} from './types';
