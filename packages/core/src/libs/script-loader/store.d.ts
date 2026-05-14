import type { ConsentStoreState } from '../../store/type';
import type { Script } from './types';
/**
 * Creates script management functions for the consent manager store.
 *
 * @remarks
 * The returned methods are intended to be spread into the
 * {@link ConsentStoreState} and provide script loading/unloading behavior
 * based on the current consent state.
 *
 * @param getState - Function to get the current state from the store
 * @param setState - Function to update the state in the store
 * @returns Object containing script management functions
 *
 * @internal
 */
export declare function createScriptManager(
	getState: () => ConsentStoreState,
	setState: (partial: Partial<ConsentStoreState>) => void
): {
	/**
	 * Updates scripts based on current consent state.
	 * Loads scripts that have consent and aren't loaded yet.
	 * Unloads scripts that no longer have consent.
	 *
	 * @returns Object containing arrays of loaded and unloaded script IDs
	 */
	updateScripts: () => import('./types').ScriptUpdateResult;
	/**
	 * Sets multiple script configurations to the store.
	 *
	 * @param scripts - Array of script configurations to add
	 */
	setScripts: (scripts: Script[]) => void;
	/**
	 * Removes a script configuration from the store.
	 *
	 * @param scriptId - ID of the script to remove
	 *
	 * @remarks
	 * If the script is currently loaded, it will be unloaded and the DOM
	 * element will be removed.
	 */
	removeScript: (scriptId: string) => void;
	/**
	 * Reloads a specific script based on its configuration and current
	 * consent state.
	 *
	 * @param scriptId - ID of the script to reload
	 * @returns A promise that resolves to the reloaded script element, or
	 * `null` if the script could not be reloaded
	 */
	reloadScript: (scriptId: string) => boolean;
	/**
	 * Checks if a script is currently loaded.
	 *
	 * @param scriptId - ID of the script to check
	 * @returns True if the script is loaded, false otherwise
	 */
	isScriptLoaded: (scriptId: string) => boolean;
	/**
	 * Gets all currently loaded script IDs.
	 *
	 * @returns Array of loaded script IDs
	 */
	getLoadedScriptIds: () => string[];
};
