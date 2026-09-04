/**
 * Lazy IAB factory.
 *
 * The runtime takes `createIAB` as an injected factory (`@c15t/iab` depends
 * on `@c15t/core`, so core cannot import it) and calls it synchronously.
 * A static import would put the whole TCF implementation in the boot chunk
 * of every page, including sites that never turn IAB on, so this returns a
 * handle immediately and forwards to the real one once the dynamic import
 * resolves.
 *
 * The window that opens between the two is closed by
 * {@link IABLoader.whenReady}: the client awaits it before mounting the IAB
 * dialog, so the surface never renders against a handle whose methods have
 * not arrived.
 */

import type {
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABHandle,
} from '@c15t/core/runtime';

/** Resolves the `createIAB` export. Injected so tests can supply their own. */
export type IABModuleLoader = () => Promise<{
	createIAB: ConsentRuntimeIABFactory;
}>;

/** A lazy factory plus a way to wait for its pending loads. */
export interface IABLoader {
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
export const createLazyIABLoader = function createLazyIABLoader(
	load: IABModuleLoader
): IABLoader {
	let ready: Promise<unknown> = Promise.resolve();

	const create: ConsentRuntimeIABFactory = function create(options) {
		let inner: ConsentRuntimeIABHandle | null = null;
		let disposed = false;

		const pending = (async () => {
			try {
				const { createIAB } = await load();
				if (disposed) {
					return;
				}
				inner = createIAB(options);
			} catch {
				// A failed load leaves IAB unmounted; the rest of the page works.
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
				const source = inner as Record<string, unknown> | null;
				const value = source?.[property as string];
				return typeof value === 'function' ? value.bind(source) : value;
			},
			has(_target, property) {
				return property === 'dispose' || property in (inner ?? {});
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

const defaultLoader = createLazyIABLoader(() => import('@c15t/iab'));

/** The `createIAB` the client hands the runtime. */
export const lazyCreateIAB = defaultLoader.create;

/** Resolves once every pending `@c15t/iab` load has settled. */
export const whenIABReady = defaultLoader.whenReady;
