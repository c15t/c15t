/**
 * Runtime module factories that load their module on demand.
 *
 * The runtime calls each module factory synchronously while it mounts.
 * Importing every factory statically puts every module in the first-load
 * chunk, including the ones a page never configures. {@link lazyRuntimeModule}
 * keeps the synchronous call and moves the module behind a dynamic
 * `import()` the caller writes: the handle comes back at once, queues calls
 * made before the module lands and replays them in order once it does. The
 * same precedent as `createLazyIABFactory`, and for the same reason the
 * loader is injected: core holds no `import()` of its own modules, so a
 * bundler never splits them for a host that loads them statically.
 *
 * Only a configured module loads: a page without `networkBlocker` never
 * fetches the blocker. What a lazy module changes is when it starts:
 *
 * - script loader: consented scripts mount once the chunk lands;
 * - network blocker: matching requests stay held (the runtime holds them
 *   from construction) until the chunk lands and decides them;
 * - iframe blocker: gated frames with a `src` load until it lands, unless
 *   the host pauses them itself (React watches for them);
 * - clear on revocation: it waits for the policy anyway;
 * - persistence: stored choices apply once the chunk lands, so a returning
 *   visitor can see the prompt for that long. Prefer the static factory.
 *
 * The revocation reload watcher has no lazy factory: it must observe the
 * first save. `createWindowDebug` shares its module with the mode
 * resolver the runtime imports anyway, so a lazy one would save nothing.
 *
 * @example
 * ```ts
 * import { watchRevocationReload } from '@c15t/core';
 * import { createPersistence } from '@c15t/core/modules/persistence';
 * import { createWindowDebug } from '@c15t/core/modules/window-debug';
 * import {
 *   createConsentProviderRuntime,
 *   lazyRuntimeModule,
 * } from '@c15t/core/runtime';
 *
 * const runtime = createConsentProviderRuntime(options, {
 *   createClearOnRevocation: lazyRuntimeModule(() =>
 *     import('@c15t/core/modules/clear-on-revocation').then(
 *       (module) => module.createClearOnRevocation
 *     )
 *   ),
 *   createIframeBlocker: lazyRuntimeModule(() =>
 *     import('@c15t/core/modules/iframe-blocker').then(
 *       (module) => module.createIframeBlocker
 *     )
 *   ),
 *   createNetworkBlocker: lazyRuntimeModule(() =>
 *     import('@c15t/core/modules/network-blocker').then(
 *       (module) => module.createNetworkBlocker
 *     )
 *   ),
 *   createPersistence,
 *   createScriptLoader: lazyRuntimeModule(() =>
 *     import('@c15t/core/modules/script-loader').then(
 *       (module) => module.createScriptLoader
 *     )
 *   ),
 *   createWindowDebug,
 *   watchRevocationReload,
 * });
 * ```
 */

import { isProductionBuild } from '../libs/is-production';

const LOADED = Symbol('c15t-lazy-module-loaded');

/**
 * Run `next` once a module handle from {@link lazyRuntimeModule} has loaded
 * (or its first load failed), the point from which it is subscribed to the
 * kernel; at once for a handle that was real from the start. Lets a module
 * that must subscribe after another wait for it, and a caller find out that
 * a module it waits for did not load.
 *
 * @param handle - A module handle, lazy or not.
 * @param next - What to run after it.
 * @internal
 */
export const afterModuleLoaded = function afterModuleLoaded(
	handle: { dispose: () => void } | null | undefined,
	next: () => void
): void {
	const loaded = (handle as { [LOADED]?: Promise<void> } | null | undefined)?.[
		LOADED
	];
	if (!loaded) {
		next();
		return;
	}
	void (async () => {
		await loaded;
		next();
	})();
};

/**
 * Wrap a module factory so the module loads on first use.
 *
 * The returned factory starts the import when it is called and returns a
 * stand-in handle at once. Until the module lands, every method call on
 * the stand-in is queued and returns `undefined` (so `hydrate()` and
 * `reconcile()` read as "nothing changed"); after that, calls go straight
 * to the real handle. `dispose()` before the module lands cancels it. A
 * module that fails to load leaves the stand-in inert, warns with the error
 * outside production, and loads again the next time the browser comes back
 * online.
 *
 * @param load - Resolves the module's factory, usually through `import()`.
 * @returns A factory with the same signature.
 */
export const lazyRuntimeModule = function lazyRuntimeModule<
	Options,
	Handle extends { dispose: () => void },
>(
	load: () => Promise<(options: Options) => Handle>
): (options: Options) => Handle {
	return (options) => {
		let inner: Handle | null = null;
		let disposed = false;
		const queued: [PropertyKey, unknown[]][] = [];
		const attempt = async (): Promise<void> => {
			try {
				const create = await load();
				if (disposed) {
					return;
				}
				inner = create(options);
				for (const [method, args] of queued.splice(0)) {
					(
						inner as unknown as Record<
							PropertyKey,
							(...a: unknown[]) => unknown
						>
					)[method]?.(...args);
				}
			} catch (error) {
				// Inert: the page works without the module. Say why, since a
				// failed chunk or a factory that throws is otherwise silent. A
				// chunk that failed for lack of a network loads once there is
				// one again.
				if (!isProductionBuild()) {
					console.warn(
						'c15t: a runtime module failed to load and stays inactive.',
						error
					);
				}
				if (!disposed && typeof window !== 'undefined') {
					window.addEventListener('online', attempt, { once: true });
				}
			}
		};
		const loaded = attempt();
		return new Proxy({} as Handle, {
			get(_target, method) {
				if (method === LOADED) {
					return loaded;
				}
				if (method === 'dispose') {
					return () => {
						disposed = true;
						queued.length = 0;
						if (typeof window !== 'undefined') {
							window.removeEventListener('online', attempt);
						}
						inner?.dispose();
						inner = null;
					};
				}
				return (...args: unknown[]) => {
					if (inner) {
						return (
							inner as unknown as Record<
								PropertyKey,
								(...a: unknown[]) => unknown
							>
						)[method]?.(...args);
					}
					if (!disposed) {
						queued.push([method, args]);
					}
					return undefined;
				};
			},
		});
	};
};
