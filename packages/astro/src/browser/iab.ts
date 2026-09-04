/**
 * Lazy IAB factory.
 *
 * The runtime takes `createIAB` as an injected factory (`@c15t/iab` depends
 * on `@c15t/core`, so core cannot import it) and calls it synchronously.
 * A static import here would put the whole TCF implementation in the boot
 * chunk of every page, including sites that never turn IAB on, so this
 * returns a handle immediately and forwards to the real one once the
 * dynamic import resolves.
 */

import type {
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABHandle,
} from '../runtime';

/**
 * An IAB factory that loads `@c15t/iab` on demand.
 *
 * @param options - Factory options, forwarded verbatim to `createIAB`.
 * @returns A handle that proxies to the real one once it exists.
 */
export const lazyCreateIAB: ConsentRuntimeIABFactory = function lazyCreateIAB(
	options
) {
	let inner: ConsentRuntimeIABHandle | null = null;
	let disposed = false;

	void (async () => {
		const { createIAB } = await import('@c15t/iab');
		if (disposed) {
			return;
		}
		inner = createIAB(options as never) as unknown as ConsentRuntimeIABHandle;
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
