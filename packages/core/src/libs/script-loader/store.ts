import type { PrivacyConsentState } from '../../store.type';
import {
	getLoadedScriptIds,
	isScriptLoaded,
	reloadScript,
	updateScripts,
} from './core';
import type { Script } from './types';
import { generateRandomScriptId, loadedScripts } from './utils';

/**
 * Creates script management functions for the consent manager store.
 *
 * @param getState - Function to get the current state from the store
 * @param setState - Function to update the state in the store
 * @returns Object containing script management functions
 * @internal
 */
export function createScriptManager(
	getState: () => PrivacyConsentState,
	setState: (partial: Partial<PrivacyConsentState>) => void
) {
	return {
		/**
		 * Adds a script configuration to the store.
		 *
		 * @param script - The script configuration to add
		 */
		addScript: (script: Script) => {
			const state = getState();
			const newScriptIdMap = { ...state.scriptIdMap };

			// Generate a random ID for the script if anonymization is enabled
			if (script.anonymizeId !== false) {
				newScriptIdMap[script.id] = generateRandomScriptId();
			}

			setState({
				scripts: [...state.scripts, script],
				scriptIdMap: newScriptIdMap,
			});
		},

		/**
		 * Adds multiple script configurations to the store.
		 *
		 * @param scripts - Array of script configurations to add
		 */
		addScripts: (scripts: Script[]) => {
			const state = getState();
			const newScriptIdMap = { ...state.scriptIdMap };

			// Generate random IDs for scripts that need anonymization
			scripts.forEach((script) => {
				if (script.anonymizeId !== false) {
					newScriptIdMap[script.id] = generateRandomScriptId();
				}
			});

			setState({
				scripts: [...state.scripts, ...scripts],
				scriptIdMap: newScriptIdMap,
			});
		},

		/**
		 * Removes a script configuration from the store.
		 *
		 * @param scriptId - ID of the script to remove
		 */
		removeScript: (scriptId: string) => {
			const state = getState();

			// Find the script configuration
			const script = state.scripts.find((s) => s.id === scriptId);

			// If the script is loaded, unload it first
			if (loadedScripts.has(scriptId)) {
				const scriptElement = loadedScripts.get(scriptId);
				if (scriptElement) {
					// Get the element ID (either anonymized or prefixed)
					const elementId =
						state.scriptIdMap[scriptId] || `c15t-script-${scriptId}`;

					// Create callback info object
					const callbackInfo = {
						id: scriptId,
						elementId,
						consents: state.consents,
						element: scriptElement,
					};

					// Execute onDelete callback if provided
					if (script?.onDelete) {
						script.onDelete(callbackInfo);
					}

					scriptElement.remove();
					loadedScripts.delete(scriptId);
				}
			}

			// Create a new scriptIdMap without the removed script
			const newScriptIdMap = { ...state.scriptIdMap };
			delete newScriptIdMap[scriptId];

			// Remove from scripts array
			setState({
				scripts: state.scripts.filter((script) => script.id !== scriptId),
				loadedScripts: {
					...state.loadedScripts,
					[scriptId]: false,
				},
				scriptIdMap: newScriptIdMap,
			});
		},

		/**
		 * Reloads a specific script.
		 *
		 * @param scriptId - ID of the script to reload
		 * @returns True if the script was reloaded, false otherwise
		 */
		reloadScript: (scriptId: string) => {
			const state = getState();
			return reloadScript(
				scriptId,
				state.scripts,
				state.consents,
				state.scriptIdMap
			);
		},

		/**
		 * Checks if a script is currently loaded.
		 *
		 * @param scriptId - ID of the script to check
		 * @returns True if the script is loaded, false otherwise
		 */
		isScriptLoaded: (scriptId: string) => {
			return isScriptLoaded(scriptId);
		},

		/**
		 * Gets all currently loaded script IDs.
		 *
		 * @returns Array of loaded script IDs
		 */
		getLoadedScriptIds: () => {
			return getLoadedScriptIds();
		},

		/**
		 * Updates scripts based on current consent state.
		 * Loads scripts that have consent and aren't loaded yet.
		 * Unloads scripts that no longer have consent.
		 * @returns Object containing arrays of loaded and unloaded script IDs
		 */
		updateScripts: () => {
			const { scripts, consents, scriptIdMap, loadedScripts } = getState();

			const result = updateScripts(scripts, consents, scriptIdMap);

			// Update loadedScripts state
			const newLoadedScripts = { ...loadedScripts };

			// Mark loaded scripts
			result.loaded.forEach((id: string) => {
				newLoadedScripts[id] = true;
			});

			// Mark unloaded scripts
			result.unloaded.forEach((id: string) => {
				newLoadedScripts[id] = false;
			});

			setState({ loadedScripts: newLoadedScripts });
			return result;
		},
	};
}
