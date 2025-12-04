import type { ConsentStoreState } from '../../store/type';
import type { AllConsentNames } from '../../types';
import { extractConsentNamesFromCondition, has } from '../has';
import {
	getLoadedScriptIds,
	isScriptLoaded,
	reloadScript,
	updateScripts,
} from './core';
import type { Script } from './types';
import {
	deleteLoadedScript,
	generateRandomScriptId,
	getLoadedScript,
	hasLoadedScript,
} from './utils';

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
export function createScriptManager(
	getState: () => ConsentStoreState,
	setState: (partial: Partial<ConsentStoreState>) => void
) {
	const updateScriptsFn = () => {
		const { scripts, consents, scriptIdMap } = getState();

		const result = updateScripts(scripts, consents, scriptIdMap);

		// Update loadedScripts state
		const newLoadedScripts = { ...getState().loadedScripts };

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
	};

	return {
		/**
		 * Updates scripts based on current consent state.
		 * Loads scripts that have consent and aren't loaded yet.
		 * Unloads scripts that no longer have consent.
		 *
		 * @returns Object containing arrays of loaded and unloaded script IDs
		 */
		updateScripts: () => updateScriptsFn(),

		/**
		 * Sets multiple script configurations to the store.
		 *
		 * @param scripts - Array of script configurations to add
		 */
		setScripts: (scripts: Script[]) => {
			const state = getState();
			const newScriptIdMap = { ...state.scriptIdMap };

			// Generate random IDs for scripts that need anonymization
			scripts.forEach((script) => {
				if (script.anonymizeId !== false) {
					newScriptIdMap[script.id] = generateRandomScriptId();
				}
			});

			// Extract categories from new scripts and update gdprTypes
			const newCategories = scripts.flatMap((script) =>
				extractConsentNamesFromCondition(script.category)
			);

			const allCategoriesSet = new Set<AllConsentNames>([
				...state.gdprTypes,
				...newCategories,
			]);
			const allCategories = Array.from(allCategoriesSet);

			setState({
				scripts: [...state.scripts, ...scripts],
				scriptIdMap: newScriptIdMap,
				gdprTypes: allCategories,
			});

			updateScriptsFn();
		},

		/**
		 * Removes a script configuration from the store.
		 *
		 * @param scriptId - ID of the script to remove
		 *
		 * @remarks
		 * If the script is currently loaded, it will be unloaded, its
		 * `onDelete` callback (if any) will be called, and the DOM element
		 * will be removed.
		 */
		removeScript: (scriptId: string) => {
			const state = getState();

			// Find the script configuration
			const script = state.scripts.find((s) => s.id === scriptId);

			// If the script is loaded, unload it first
			if (hasLoadedScript(scriptId)) {
				const scriptElement = getLoadedScript(scriptId);
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
						hasConsent: has(script?.category ?? 'necessary', state.consents),
					};

					// Execute onDelete callback if provided
					if (script?.onDelete) {
						script.onDelete(callbackInfo);
					}

					scriptElement.remove();
					deleteLoadedScript(scriptId);
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
		 * Reloads a specific script based on its configuration and current
		 * consent state.
		 *
		 * @param scriptId - ID of the script to reload
		 * @returns A promise that resolves to the reloaded script element, or
		 * `null` if the script could not be reloaded
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
	};
}
