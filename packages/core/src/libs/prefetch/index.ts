/**
 * Browser-side prefetch utilities for c15t consent init data.
 *
 * These functions let any framework start the `/init` request early
 * (before hydration) and share the result with the consent provider.
 *
 * @remarks
 * Framework adapters like `@c15t/nextjs` provide thin wrappers
 * (e.g. `C15tPrefetch`) that use these building blocks with
 * framework-specific script injection.
 */

export {
	buildPrefetchScript,
	ensurePrefetchedInitialData,
	getPrefetchedInitialData,
} from './prefetch';
export type { PrefetchOptions } from './types';
