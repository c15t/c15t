/**
 * A `createIAB` factory that loads `@c15t/iab` on demand.
 *
 * The runtime takes `createIAB` as an injected factory — `@c15t/iab`
 * depends on `@c15t/core`, so core cannot import it — and calls it
 * synchronously while mounting. A framework package that imports
 * `createIAB` statically puts the whole TCF implementation in the chunk
 * every app loads, including the sites that never turn IAB on. Wrapping
 * the import in this factory keeps the synchronous call site and moves the
 * bytes behind a dynamic `import()`: the handle comes back immediately and
 * forwards to the real one once the module resolves.
 *
 * The window between the two is closed by {@link LazyIABFactory.whenReady}:
 * a surface awaits it before rendering against the handle, so it never
 * reads methods that have not arrived.
 *
 * @example
 * ```ts
 * const iab = createLazyIABFactory(() => import('@c15t/iab'));
 * const runtime = createConsentRuntime({
 *   createIAB: iab.create,
 *   iab: { cmpId: 123 },
 *   mode: hosted({ url: '/api/c15t' }),
 * });
 * runtime.start();
 * await iab.whenReady();
 * ```
 */

import type {
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABHandle,
} from './types';

/**
 * Resolves the `createIAB` export.
 *
 * Normally `() => import('@c15t/iab')`; injected so tests and alternative
 * CMP implementations can supply their own.
 */
export type IABModuleLoader = () => Promise<{
	createIAB: ConsentRuntimeIABFactory;
}>;

/** A lazy `createIAB` plus a way to wait for its pending loads. */
export interface LazyIABFactory {
	/** Pass this as the runtime's `createIAB`. */
	create: ConsentRuntimeIABFactory;
	/**
	 * Resolves once every load started so far has settled.
	 *
	 * Never rejects: a failed load leaves IAB inert rather than breaking
	 * the page.
	 */
	whenReady: () => Promise<void>;
}

/**
 * Build an IAB factory that loads its implementation on demand.
 *
 * @param load - Resolves the module exporting `createIAB`.
 * @returns The factory and its readiness signal.
 */
/** Handle methods a surface may call before the CMP module has loaded. */
const QUEUED_METHODS = new Set<keyof ConsentRuntimeIABHandle>([
	'acceptAll',
	'generateTCString',
	'rejectAll',
	'save',
	'setPurposeConsent',
	'setPurposeLegitimateInterest',
	'setSpecialFeatureOptIn',
	'setVendorConsent',
	'setVendorLegitimateInterest',
]);

export const createLazyIABFactory = function createLazyIABFactory(
	load: IABModuleLoader
): LazyIABFactory {
	let ready: Promise<unknown> = Promise.resolve();

	const create: ConsentRuntimeIABFactory = function create(options) {
		let inner: ConsentRuntimeIABHandle | null = null;
		let disposed = false;
		let failed = false;

		const pending = (async () => {
			try {
				const { createIAB } = await load();
				if (disposed) {
					return;
				}
				inner = createIAB(options);
			} catch {
				// A failed load leaves IAB unmounted; the rest of the page works.
				failed = true;
			}
		})();
		const previous = ready;
		ready = (async () => {
			await previous;
			await pending;
		})();

		return new Proxy({} as ConsentRuntimeIABHandle, {
			get(_target, property) {
				if (property === 'dispose') {
					return () => {
						disposed = true;
						inner?.dispose();
						inner = null;
					};
				}
				// Readiness travels with the handle, not with the factory: a
				// surface that borrowed this runtime from another package has
				// no access to the loader that created it.
				if (property === 'whenReady') {
					return async () => {
						await pending;
						await inner?.whenReady?.();
					};
				}
				const source = inner as Record<string, unknown> | null;
				if (source) {
					const value = source[property as string];
					return typeof value === 'function' ? value.bind(source) : value;
				}
				// A server-rendered surface is interactive before the module
				// lands. Queue the call instead of dropping it, so an early
				// Accept still records consent once the real handle exists.
				if (
					!failed &&
					typeof property === 'string' &&
					QUEUED_METHODS.has(property as keyof ConsentRuntimeIABHandle)
				) {
					return async (...args: unknown[]) => {
						await pending;
						const target = inner as Record<string, unknown> | null;
						const method = target?.[property];
						return typeof method === 'function'
							? method.apply(target, args)
							: undefined;
					};
				}
				return undefined;
			},
			has(_target, property) {
				return (
					property === 'dispose' ||
					property === 'whenReady' ||
					(inner
						? property in inner
						: !failed &&
							QUEUED_METHODS.has(property as keyof ConsentRuntimeIABHandle))
				);
			},
		});
	};

	return {
		create,
		async whenReady() {
			await ready;
		},
	};
};
