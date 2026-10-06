import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from '../modules/clear-on-revocation/types';
/**
 * `@c15t/core/runtime` — the framework-agnostic consent runtime.
 *
 * A provider is two things: a kernel wired to every opt-in module, and a
 * component tree that renders it. This module is the first half. It builds
 * a kernel from the prepared server snapshot, then mounts persistence,
 * the script loader, network and iframe blockers, IAB, the callback bridge,
 * `window.c15t` and the initial `init()` (or adopts a resolved prefetch) on
 * `start()`, and undoes all of it on `dispose()`.
 *
 * Two constructors share that lifecycle. `createConsentRuntime` is for a
 * host that configures once. `createConsentProviderRuntime` is for a
 * framework provider whose options follow its props: it adds `update()`,
 * the `enabled` toggle and a streamed `prefetch`, and takes the module
 * factories so the provider can load some on demand.
 *
 * Framework packages own reactivity and rendering; they do not re-derive
 * any of this. Hosts without a component tree (an Astro page whose islands
 * cannot share context, a SvelteKit root layout) create one runtime and
 * hand it to whatever renders.
 *
 * @example
 * ```ts
 * import { createConsentRuntime } from '@c15t/core/runtime';
 * import { hosted } from '@c15t/core';
 *
 * const runtime = createConsentRuntime({
 *   mode: hosted({ url: '/api/c15t' }),
 *   pkg: '@c15t/astro',
 * });
 * runtime.start();
 * ```
 */
import { createIframeBlocker } from '../modules/iframe-blocker';
import type {
	NetworkBlockerHandle,
	NetworkBlockerOptions,
} from '../modules/network-blocker/types';
import { createPersistence } from '../modules/persistence';
import { watchRevocationReload } from '../modules/revocation-reload';
import { createScriptLoader } from '../modules/script-loader';
import { createWindowDebug } from '../modules/window-debug';
import type { ConsentState } from '../types';
import { assembleConsentRuntime } from './assemble';
import { connectConsentSource } from './controls';
import { mountRuntimeIAB } from './iab-mount';
import { lazyRuntimeModule } from './lazy-module';
import type {
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
} from './types';

export { createConsentProviderRuntime } from './provider-runtime';
export { streamPrefetch } from './streamed-prefetch';
export { connectConsentSource } from './controls';
export type { ConsentControlOptions } from './controls';
export {
	createRuntimeKernel,
	hasResolvedPrefetch,
	inferConsentCategories,
	normalizeKernelUser,
	resolveRuntimeTranslations,
} from './runtime-kernel';

export type {
	ExternalConsentSource,
	ConsentRuntime,
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABFactoryOptions,
	ConsentRuntimeIABHandle,
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
	ConsentRuntimeUpdate,
	RuntimeIABOptions,
	RuntimeNetworkBlockerOptions,
	RuntimePersistenceOptions,
	RuntimePrefetch,
	RuntimeScriptLoaderOptions,
} from './types';
export type { WireRuntimeCallbacksOptions } from './callbacks';
export { stringifyRuntimeError, wireRuntimeCallbacks } from './callbacks';
export type { IABModuleLoader, LazyIABFactory } from './lazy-iab';
export { isIABConfigured } from './iab-options';
export { createLazyIABFactory } from './lazy-iab';
export { lazyRuntimeModule } from './lazy-module';
export { mountRuntimeIAB } from './iab-mount';
export type { RuntimeIABMountOptions } from './iab-mount';

/**
 * Every consent category granted.
 *
 * The snapshot a disabled runtime (`enabled: false`) reports, so anything
 * reading consent sees an unrestricted visitor. Consent-gated scripts in
 * `options.scripts` therefore load immediately, exactly as they would for a
 * visitor who accepted everything. The blockers stay unmounted: with every
 * category granted they would block nothing, so mounting them would only
 * patch `fetch` and observe the DOM for no effect.
 */
export const ALL_CONSENTS_GRANTED: ConsentState = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

const loadClearOnRevocation = function loadClearOnRevocation(
	options: ClearOnRevocationOptions
): ClearOnRevocationHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/clear-on-revocation');
		return module.createClearOnRevocation;
	})(options);
};

const loadNetworkBlocker = function loadNetworkBlocker(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	return lazyRuntimeModule(async () => {
		const module = await import('../modules/network-blocker');
		return module.createNetworkBlocker;
	})(options);
};

/**
 * The module factories `createConsentRuntime` mounts. Pass them to
 * `createConsentProviderRuntime` to do the same, or spread them and swap
 * some for `lazyRuntimeModule`.
 *
 * Persistence, the script loader, the iframe blocker, window debug and the
 * revocation reload are imported statically. The network blocker and data
 * clearing are opt-in, so they load on demand: a page that configures
 * neither never downloads them. (A provider that loads every module on
 * demand uses `onDemandRuntimeModules` from `@c15t/core/runtime/provider`,
 * whose chunks import nothing from the first load.) Matching
 * requests stay held from construction until the blocker has loaded and
 * decides them. Data clearing sweeps denied categories when it mounts, so a
 * revocation before it loaded is still cleared, a moment later.
 */
export const defaultRuntimeModules: ConsentRuntimeModules = {
	// Arrow functions rather than calls, so the object stays free of side
	// effects and a bundler drops it, and the modules it names, from a host
	// that never reads it.
	connectConsentSource,
	createClearOnRevocation: (options) => loadClearOnRevocation(options),
	createIframeBlocker,
	createNetworkBlocker: (options) => loadNetworkBlocker(options),
	createPersistence,
	createScriptLoader,
	createWindowDebug,
	mountIAB: mountRuntimeIAB,
	watchRevocationReload,
};

/**
 * Creates a consent runtime: a kernel plus every opt-in module, wired.
 *
 * For a page-level host that configures once: the script tag, an Astro
 * page, a root layout sharing one runtime. It mounts
 * {@link defaultRuntimeModules}. A framework provider whose options follow
 * its props uses `createConsentProviderRuntime`, which adds `update()`, the
 * `enabled` toggle, a streamed `prefetch` and a choice of module loading.
 *
 * Construction preserves the prepared server snapshot. Storage hydration and
 * browser privacy-signal activation happen on start.
 *
 * Nothing else happens until {@link ConsentRuntime.start} is called.
 *
 * @param options - The runtime configuration.
 * @returns The runtime handle.
 * @throws {Error} When `mode` is not a transport factory.
 *
 * @example
 * ```ts
 * const runtime = createConsentRuntime({
 *   createIAB,
 *   iab: { cmpId: 123 },
 *   mode: hosted({ url: '/api/c15t' }),
 *   scripts: [{ category: 'measurement', id: 'ga', src: '...' }],
 * });
 * runtime.start();
 * // ... later
 * runtime.dispose();
 * ```
 */
export const createConsentRuntime = function createConsentRuntime(
	options: ConsentRuntimeOptions
): ConsentRuntime {
	return assembleConsentRuntime(options, defaultRuntimeModules).runtime;
};
