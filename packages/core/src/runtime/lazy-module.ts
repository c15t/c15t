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
/**
 * Wrap a module factory so the module loads on first use.
 *
 * The returned factory starts the import when it is called and returns a
 * stand-in handle at once. Until the module lands, every method call on
 * the stand-in is queued and returns `undefined` (so `hydrate()` and
 * `reconcile()` read as "nothing changed"); after that, calls go straight
 * to the real handle. `dispose()` before the module lands cancels it. A
 * module that fails to load leaves the stand-in inert.
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
		void (async () => {
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
			} catch {
				// Inert: the page works without the module.
			}
		})();
		return new Proxy({} as Handle, {
			get(_target, method) {
				if (method === 'dispose') {
					return () => {
						disposed = true;
						queued.length = 0;
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
