import type { ConsentState } from '../../types/compliance';
import { has } from '../has';
import type { Script, ScriptCallbackInfo, ScriptUpdateResult } from './types';
import {
	clearLoadedScripts,
	deleteLoadedScript,
	getLoadedScript,
	getLoadedScriptsSnapshot,
	getScriptElementId,
	hasLoadedScript,
	setLoadedScript,
} from './utils';

/**
 * Loads scripts based on user consent settings.
 *
 * @param scripts - Array of script configurations to potentially load
 * @param consents - Current user consent state
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @returns Array of script IDs that were loaded
 *
 * @throws {Error} When a script with the same ID is already loaded
 *
 * @remarks
 * The loading process follows these steps:
 * 1. Check if the script has consent to load
 * 2. Check if the script is already loaded
 * 3. Create the script element with all specified attributes
 * 4. Apply ID anonymization if enabled (default behavior)
 * 5. Execute the `onBeforeLoad` callback if provided
 * 6. Add the script to the document
 * 7. Track the loaded script
 *
 * When anonymizeId is enabled (default), script elements will use randomly generated IDs
 * instead of the original script IDs prefixed with 'c15t-script-'.
 *
 * @public
 */
export function loadScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {}
): string[] {
	const loadedScriptIds: string[] = [];

	scripts.forEach((script) => {
		// Skip if script doesn't have consent
		if (!has(script.category, consents)) {
			return;
		}

		// Skip if script is already loaded
		if (hasLoadedScript(script.id)) {
			script.onConsentChange?.({
				id: script.id,
				elementId: getScriptElementId(
					script.id,
					script.anonymizeId !== false,
					scriptIdMap
				),
				consents,
			});

			return;
		}

		// Validate that script has either src or textContent (but not both)
		if (script.src && script.textContent) {
			throw new Error(
				`Script '${script.id}' cannot have both 'src' and 'textContent'. Choose one.`
			);
		}

		if (!script.src && !script.textContent && !script.callbackOnly) {
			throw new Error(
				`Script '${script.id}' must have either 'src', 'textContent', or 'callbackOnly' set to true.`
			);
		}

		// Handle callback-only scripts (no DOM element needed)
		if (script.callbackOnly === true) {
			// Generate a virtual element ID for consistency
			const shouldAnonymize = script.anonymizeId !== false;
			const elementId = getScriptElementId(
				script.id,
				shouldAnonymize,
				scriptIdMap
			);

			// Create callback info object without an actual DOM element
			const callbackInfo: ScriptCallbackInfo = {
				id: script.id,
				elementId,
				consents,
			};

			// Execute onBeforeLoad callback if provided
			if (script.onBeforeLoad) {
				script.onBeforeLoad(callbackInfo);
			}

			// Immediately trigger onLoad callback if provided
			if (script.onLoad) {
				script.onLoad(callbackInfo);
			}

			// Track the script as loaded, but with null instead of a DOM element
			setLoadedScript(script.id, null);
			loadedScriptIds.push(script.id);
			return;
		}

		// Determine if we should use an anonymized ID
		const shouldAnonymize = script.anonymizeId !== false; // Default to true if not specified

		// Determine the element ID to use
		const elementId = getScriptElementId(
			script.id,
			shouldAnonymize,
			scriptIdMap
		);

		// Check if script element already exists in DOM (only for persistAfterConsentRevoked scripts)
		if (script.persistAfterConsentRevoked === true) {
			const existingElement = document.getElementById(
				elementId
			) as HTMLScriptElement;
			if (existingElement) {
				// Script element already exists in DOM, just track it and execute callbacks
				const callbackInfo: ScriptCallbackInfo = {
					id: script.id,
					elementId,
					consents,
					element: existingElement,
				};

				// Execute onConsentChange callback if provided
				script.onConsentChange?.(callbackInfo);

				// Execute onLoad callback if provided
				script.onLoad?.(callbackInfo);

				// Track the script as loaded
				setLoadedScript(script.id, existingElement);
				loadedScriptIds.push(script.id);
				return;
			}
		}

		// Create script element for standard scripts
		const scriptElement = document.createElement('script');

		// Set the element ID
		scriptElement.id = elementId;

		// Set script source or text content
		if (script.src) {
			scriptElement.src = script.src;
		} else if (script.textContent) {
			scriptElement.textContent = script.textContent;
		}

		// Set optional attributes
		if (script.fetchPriority) {
			scriptElement.fetchPriority = script.fetchPriority;
		}

		// Add async/defer attributes
		if (script.async) {
			scriptElement.async = true;
		}

		if (script.defer) {
			scriptElement.defer = true;
		}

		// Add CSP nonce if provided
		if (script.nonce) {
			scriptElement.nonce = script.nonce;
		}

		// Add any additional attributes
		if (script.attributes) {
			Object.entries(script.attributes).forEach(([key, value]) => {
				scriptElement.setAttribute(key, value);
			});
		}

		// Create callback info object
		const callbackInfo: ScriptCallbackInfo = {
			id: script.id,
			elementId,
			consents,
			element: scriptElement,
		};

		// Handle load and error events based on script type
		if (script.onLoad) {
			if (script.textContent) {
				// For text-based scripts, execute onLoad immediately after adding to DOM
				// Use setTimeout to ensure the script has been parsed and executed
				setTimeout(() => {
					script.onLoad?.({
						...callbackInfo,
					});
				}, 0);
			} else {
				// For src-based scripts, listen for the load event
				scriptElement.addEventListener('load', () => {
					script.onLoad?.({
						...callbackInfo,
					});
				});
			}
		}

		if (script.onError) {
			if (script.textContent) {
				// For text-based scripts, syntax errors will be caught by the browser
				// and we can't easily catch them here since the script executes when added to DOM
				// The onError callback is mainly for network errors with src-based scripts
			} else {
				// For src-based scripts, listen for the error event
				scriptElement.addEventListener('error', () => {
					script.onError?.({
						...callbackInfo,
						error: new Error(`Failed to load script: ${script.src}`),
					});
				});
			}
		}

		// Execute onBeforeLoad callback if provided
		if (script.onBeforeLoad) {
			script.onBeforeLoad(callbackInfo);
		}

		// Add to document and track
		document.head.appendChild(scriptElement);
		setLoadedScript(script.id, scriptElement);
		loadedScriptIds.push(script.id);
	});

	return loadedScriptIds;
}

/**
 * Unloads scripts that no longer have consent.
 *
 * @param scripts - Array of script configurations to check
 * @param consents - Current user consent state
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @returns Array of script IDs that were unloaded
 *
 * @remarks
 * The unloading process follows these steps:
 * 1. Check if the script is loaded
 * 2. Check if the script no longer has consent
 * 3. Execute the `onDelete` callback if provided
 * 4. Remove the script from the document
 * 5. Remove the script from tracking
 *
 * @public
 */
export function unloadScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {}
): string[] {
	const unloadedScriptIds: string[] = [];

	scripts.forEach((script) => {
		// Skip if script is not loaded
		if (!hasLoadedScript(script.id)) {
			return;
		}

		// Check if script no longer has consent
		if (!has(script.category, consents)) {
			const scriptElement = getLoadedScript(script.id);

			// Get the element ID (either anonymized or prefixed)
			const elementId = scriptIdMap[script.id] || `c15t-script-${script.id}`;

			// Handle callback-only scripts
			if (script.callbackOnly === true || scriptElement === null) {
				// Create callback info object without an element
				const callbackInfo: ScriptCallbackInfo = {
					id: script.id,
					elementId,
					consents,
				};

				// Execute onDelete callback if provided
				if (script.onDelete) {
					script.onDelete(callbackInfo);
				}

				// Remove from tracking
				deleteLoadedScript(script.id);
				unloadedScriptIds.push(script.id);
			}
			// Handle standard scripts with DOM elements
			else if (scriptElement) {
				// Create callback info object
				const callbackInfo: ScriptCallbackInfo = {
					id: script.id,
					elementId,
					consents,
					element: scriptElement,
				};

				// Execute onDelete callback if provided
				if (script.onDelete) {
					script.onDelete(callbackInfo);
				}

				// Only remove from DOM if persistAfterConsentRevoked is not true
				if (!script.persistAfterConsentRevoked) {
					scriptElement.remove();
					// Remove from tracking
					deleteLoadedScript(script.id);
					unloadedScriptIds.push(script.id);
				}
				// If persistAfterConsentRevoked is true, keep the script in DOM but still track as unloaded
				else {
					deleteLoadedScript(script.id);
					unloadedScriptIds.push(script.id);
				}
			}
		}
	});

	return unloadedScriptIds;
}

/**
 * Updates scripts based on current consent state, loading new scripts and unloading revoked ones.
 *
 * @param scripts - Array of script configurations to manage
 * @param consents - Current user consent state
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @returns Object containing arrays of loaded and unloaded script IDs
 *
 * @remarks
 * When anonymizeId is enabled (default), script elements will use randomly generated IDs
 * instead of the original script IDs prefixed with 'c15t-script-'.
 *
 * @public
 */
export function updateScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {}
): ScriptUpdateResult {
	const unloaded = unloadScripts(scripts, consents, scriptIdMap);
	const loaded = loadScripts(scripts, consents, scriptIdMap);

	return {
		loaded,
		unloaded,
	};
}

/**
 * Checks if a script is currently loaded.
 *
 * @param scriptId - ID of the script to check
 * @returns True if the script is loaded, false otherwise
 *
 * @public
 */
export function isScriptLoaded(scriptId: string): boolean {
	return hasLoadedScript(scriptId);
}

/**
 * Gets all currently loaded script IDs.
 *
 * @returns Array of loaded script IDs
 *
 * @public
 */
export function getLoadedScriptIds(): string[] {
	return Array.from(getLoadedScriptsSnapshot().keys());
}

/**
 * Removes all loaded scripts from the DOM and clears the tracking.
 *
 * @param scripts - Optional array of script configurations to check for onDelete callbacks
 * @param consents - Optional consent state to pass to onDelete callbacks
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @returns Array of script IDs that were unloaded
 *
 * @remarks
 * If the scripts parameter is provided, the function will call the onDelete callback
 * for each script that is being removed. If consents is also provided, it will be passed
 * to the onDelete callbacks.
 *
 * @public
 */
export function clearAllScripts(
	scripts?: Script[],
	consents?: ConsentState,
	scriptIdMap: Record<string, string> = {}
): string[] {
	const unloadedScriptIds: string[] = [];

	getLoadedScriptsSnapshot().forEach((scriptElement, id) => {
		// Execute onDelete callback if provided and if we have the script config
		if (scripts && consents) {
			const script = scripts.find((s) => s.id === id);
			if (script?.onDelete) {
				// Get the element ID (either anonymized or prefixed)
				const elementId = scriptIdMap[id] || `c15t-script-${id}`;

				// Create callback info object with or without element based on script type
				const callbackInfo: ScriptCallbackInfo = {
					id,
					elementId,
					consents,
					...(scriptElement !== null && { element: scriptElement }),
				};

				script.onDelete(callbackInfo);
			}
		}

		// Only remove from DOM if it's an actual DOM element (not a callback-only script)
		// and if persistAfterConsentRevoked is not true
		if (scriptElement !== null) {
			const script = scripts?.find((s) => s.id === id);
			if (!script?.persistAfterConsentRevoked) {
				scriptElement.remove();
			}
		}

		unloadedScriptIds.push(id);
	});

	clearLoadedScripts();
	return unloadedScriptIds;
}

/**
 * Reloads a script by first removing it and then loading it again.
 * Useful for updating scripts to newer versions.
 *
 * @param scriptId - ID of the script to reload
 * @param scripts - Array of script configurations
 * @param consents - Current user consent state
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @returns True if the script was reloaded, false otherwise
 *
 * @public
 */
export function reloadScript(
	scriptId: string,
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {}
): boolean {
	const script = scripts.find((s) => s.id === scriptId);

	if (!script) {
		return false;
	}

	// Remove the script if it's loaded
	if (hasLoadedScript(scriptId)) {
		const scriptElement = getLoadedScript(scriptId);

		// Get the element ID (either anonymized or prefixed)
		const elementId = scriptIdMap[scriptId] || `c15t-script-${scriptId}`;

		// Handle callback-only scripts
		if (script.callbackOnly === true || scriptElement === null) {
			// Create callback info object without an element
			const callbackInfo: ScriptCallbackInfo = {
				id: scriptId,
				elementId,
				consents,
			};

			// Execute onDelete callback if provided
			if (script.onDelete) {
				script.onDelete(callbackInfo);
			}

			deleteLoadedScript(scriptId);
		}
		// Handle standard scripts with DOM elements
		else if (scriptElement) {
			// Create callback info object
			const callbackInfo: ScriptCallbackInfo = {
				id: scriptId,
				elementId,
				consents,
				element: scriptElement,
			};

			// Execute onDelete callback if provided
			if (script.onDelete) {
				script.onDelete(callbackInfo);
			}

			// Only remove from DOM if persistAfterConsentRevoked is not true
			if (!script.persistAfterConsentRevoked) {
				scriptElement.remove();
			}

			deleteLoadedScript(scriptId);
		}
	}

	// Check if the script has consent before reloading
	if (!has(script.category, consents)) {
		return false;
	}

	// Load the script
	loadScripts([script], consents, scriptIdMap);
	return true;
}
