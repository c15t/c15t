import type * as IabtechlabtcfCoreTypes from '@iabtechlabtcf/core';
/**
 * Lazy Loading for @iabtechlabtcf/core
 *
 * Provides lazy loading of the IAB TCF core library to minimize
 * bundle impact for users who don't enable IAB mode.
 *
 * @packageDocumentation
 */

/**
 * The lazy-loaded TCF core module type.
 */
export type TCFCoreModule = typeof IabtechlabtcfCoreTypes;

/** Cached module reference */
let tcfCoreModule: TCFCoreModule | null = null;

/** Promise for in-flight loading */
let loadingPromise: Promise<TCFCoreModule> | null = null;

/**
 * Lazily loads the @iabtechlabtcf/core module.
 *
 * This ensures the ~50KB library is only loaded when IAB mode is enabled,
 * keeping the bundle size zero for users who don't use IAB.
 *
 * @returns Promise resolving to the TCF core module
 *
 * @example
 * ```typescript
 * const { TCModel, TCString, GVL } = await getTCFCore();
 *
 * const gvl = new GVL(gvlData);
 * const tcModel = new TCModel(gvl);
 * const encoded = TCString.encode(tcModel);
 * ```
 *
 * @public
 */
export const getTCFCore = function getTCFCore(): Promise<TCFCoreModule> {
	// Return cached module if already loaded
	if (tcfCoreModule) {
		return Promise.resolve(tcfCoreModule);
	}

	// If already loading, return the existing promise
	if (loadingPromise) {
		return loadingPromise;
	}

	// Start loading
	loadingPromise = (async () => {
		try {
			const module = await import('@iabtechlabtcf/core');
			tcfCoreModule = module;
			loadingPromise = null;
			return module;
		} catch (error) {
			loadingPromise = null;
			throw new Error(
				`Failed to load @iabtechlabtcf/core: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
					'Make sure it is installed as a dependency.',
				{ cause: error }
			);
		}
	})();

	return loadingPromise;
};

/**
 * Checks if the TCF core module is already loaded.
 *
 * @returns True if the module is loaded and ready
 *
 * @public
 */
export const isTCFCoreLoaded = function isTCFCoreLoaded(): boolean {
	return tcfCoreModule !== null;
};

/**
 * Gets the cached TCF core module synchronously.
 *
 * @returns The cached module or null if not loaded
 *
 * @public
 */
export const getTCFCoreSync = function getTCFCoreSync(): TCFCoreModule | null {
	return tcfCoreModule;
};

/**
 * Resets the module cache (mainly for testing).
 *
 * @internal
 */
export const resetTCFCoreCache = function resetTCFCoreCache(): void {
	tcfCoreModule = null;
	loadingPromise = null;
};
