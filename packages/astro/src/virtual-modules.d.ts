/**
 * Ambient declaration for the build-time virtual modules the `c15t()`
 * integration generates.
 *
 * `virtual:c15t/options` is produced by the integration's Vite plugin and
 * carries the serialized configuration to the middleware, the injected API
 * routes and the client boot script — one copy, read by everyone.
 */

declare module 'virtual:c15t/options' {
	import type { C15tResolvedOptions } from './types';

	const options: C15tResolvedOptions;
	export default options;
}
