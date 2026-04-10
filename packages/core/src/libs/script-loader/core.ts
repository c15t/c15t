import type { ConsentState } from '../../types/compliance';
import type { Model } from '../determine-model';
import { has } from '../has';
import { emitScriptDebugEvent } from './debug';
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
 * IAB consent state for script loading checks.
 *
 * @public
 */
export interface IABConsentState {
	/** Per-vendor consent state */
	vendorConsents: Record<string, boolean>;
	/** Per-vendor legitimate interest state */
	vendorLegitimateInterests: Record<string, boolean>;
	/** Per-purpose consent state (IAB purposes 1-11) */
	purposeConsents: Record<number, boolean>;
	/** Per-purpose legitimate interest state */
	purposeLegitimateInterests: Record<number, boolean>;
	/** Special feature opt-ins */
	specialFeatureOptIns: Record<number, boolean>;
}

/**
 * Options for script loading operations.
 *
 * @public
 */
export interface ScriptLoaderOptions {
	/** Current consent model ('opt-in', 'opt-out', 'iab', or null) */
	model?: Model;
	/** IAB consent state (required when model is 'iab') */
	iabConsent?: IABConsentState;
}

/**
 * Checks if a script has IAB consent to load.
 *
 * In IAB mode, consent is checked differently:
 * - If script has vendorId, check vendor consent
 * - If script has iabPurposes, check purpose consents
 * - If script has iabLegIntPurposes, check legitimate interest
 * - If script has iabSpecialFeatures, check special feature opt-ins
 *
 * @internal
 */
function hasIABConsent(script: Script, iabConsent: IABConsentState): boolean {
	// If script has a vendorId, check vendor consent
	if (script.vendorId !== undefined) {
		const vendorKey = String(script.vendorId);
		if (!iabConsent.vendorConsents[vendorKey]) {
			return false;
		}
	}

	// Check purpose consents if specified
	if (script.iabPurposes && script.iabPurposes.length > 0) {
		const hasAllPurposeConsents = script.iabPurposes.every(
			(purposeId) => iabConsent.purposeConsents[purposeId] === true
		);
		if (!hasAllPurposeConsents) {
			return false;
		}
	}

	// Check legitimate interest purposes if specified
	if (script.iabLegIntPurposes && script.iabLegIntPurposes.length > 0) {
		const hasAllLegIntConsents = script.iabLegIntPurposes.every(
			(purposeId) => iabConsent.purposeLegitimateInterests[purposeId] === true
		);
		if (!hasAllLegIntConsents) {
			return false;
		}
	}

	// Check special features if specified
	if (script.iabSpecialFeatures && script.iabSpecialFeatures.length > 0) {
		const hasAllSpecialFeatures = script.iabSpecialFeatures.every(
			(featureId) => iabConsent.specialFeatureOptIns[featureId] === true
		);
		if (!hasAllSpecialFeatures) {
			return false;
		}
	}

	return true;
}

/**
 * Checks if a script has consent to load based on current model and consent state.
 *
 * @internal
 */
function scriptHasConsent(
	script: Script,
	consents: ConsentState,
	options?: ScriptLoaderOptions
): boolean {
	// In IAB mode, use IAB consent checks if the script has IAB properties
	if (
		options?.model === 'iab' &&
		options.iabConsent &&
		(script.vendorId !== undefined ||
			script.iabPurposes ||
			script.iabLegIntPurposes ||
			script.iabSpecialFeatures)
	) {
		return hasIABConsent(script, options.iabConsent);
	}

	// Fall back to standard category-based consent check
	return has(script.category, consents);
}

function emitLifecycleEvent(
	script: Script,
	action:
		| 'skipped'
		| 'already_loaded'
		| 'callback_start'
		| 'callback_complete'
		| 'callback_error'
		| 'element_appended'
		| 'loaded'
		| 'load_listener_attached'
		| 'error_listener_attached'
		| 'unloaded',
	message: string,
	info?: Partial<ScriptCallbackInfo>,
	data?: Record<string, unknown>
): void {
	emitScriptDebugEvent({
		source: 'script-loader',
		scope: 'lifecycle',
		action,
		message,
		scriptId: script.id,
		elementId: info?.elementId,
		hasConsent: info?.hasConsent,
		callback:
			action === 'callback_start' ||
			action === 'callback_complete' ||
			action === 'callback_error'
				? (data?.callback as
						| 'onBeforeLoad'
						| 'onLoad'
						| 'onConsentChange'
						| 'onError'
						| undefined)
				: undefined,
		data,
	});
}

function invokeScriptCallback(
	script: Script,
	callbackName: 'onBeforeLoad' | 'onLoad' | 'onConsentChange' | 'onError',
	callback: ((info: ScriptCallbackInfo) => void) | undefined,
	info: ScriptCallbackInfo
): void {
	if (!callback) {
		return;
	}

	emitLifecycleEvent(
		script,
		'callback_start',
		`${callbackName} started`,
		info,
		{
			callback: callbackName,
		}
	);

	try {
		callback(info);
		emitLifecycleEvent(
			script,
			'callback_complete',
			`${callbackName} completed`,
			info,
			{
				callback: callbackName,
			}
		);
	} catch (error) {
		emitLifecycleEvent(
			script,
			'callback_error',
			`${callbackName} failed`,
			info,
			{
				callback: callbackName,
				error:
					error instanceof Error
						? error.message
						: typeof error === 'string'
							? error
							: 'Unknown error',
			}
		);
		throw error;
	}
}

/**
 * Loads scripts based on user consent settings.
 *
 * @param scripts - Array of script configurations to potentially load
 * @param consents - Current user consent state
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @param options - Additional options including IAB consent state
 * @returns Array of script IDs that were loaded
 *
 * @throws {Error} When a script with the same ID is already loaded
 *
 * @remarks
 * The loading process follows these steps:
 * 1. Check if the script has consent to load (skipped if alwaysLoad is true)
 * 2. Check if the script is already loaded
 * 3. Create the script element with all specified attributes
 * 4. Apply ID anonymization if enabled (default behavior)
 * 5. Execute the `onBeforeLoad` callback if provided
 * 6. Add the script to the document
 * 7. Track the loaded script
 *
 * Scripts with `alwaysLoad: true` will bypass consent checks and load immediately.
 * This is useful for scripts like Google Tag Manager that manage their own consent.
 *
 * When anonymizeId is enabled (default), script elements will use randomly generated IDs
 * instead of the original script IDs prefixed with 'c15t-script-'.
 *
 * In IAB mode, scripts with vendorId or iabPurposes will use IAB consent checks
 * instead of category-based consent.
 *
 * @public
 */
export function loadScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {},
	options?: ScriptLoaderOptions
): string[] {
	const loadedScriptIds: string[] = [];

	scripts.forEach((script) => {
		const hasConsent = scriptHasConsent(script, consents, options);

		// Skip if script doesn't have consent (unless alwaysLoad is true)
		if (!script.alwaysLoad && !hasConsent) {
			emitLifecycleEvent(
				script,
				'skipped',
				'Script skipped due to missing consent',
				{
					hasConsent,
				},
				{
					reason: 'missing_consent',
				}
			);
			return;
		}

		// Skip if script is already loaded
		if (hasLoadedScript(script.id)) {
			const callbackInfo: ScriptCallbackInfo = {
				id: script.id,
				elementId: getScriptElementId(
					script.id,
					script.anonymizeId !== false,
					scriptIdMap
				),
				hasConsent,
				consents,
			};

			emitLifecycleEvent(
				script,
				'already_loaded',
				'Script already loaded; running consent sync',
				callbackInfo
			);
			invokeScriptCallback(
				script,
				'onConsentChange',
				script.onConsentChange,
				callbackInfo
			);

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
				hasConsent,
			};

			invokeScriptCallback(
				script,
				'onBeforeLoad',
				script.onBeforeLoad,
				callbackInfo
			);
			invokeScriptCallback(script, 'onLoad', script.onLoad, callbackInfo);

			// Track the script as loaded, but with null instead of a DOM element
			setLoadedScript(script.id, null);
			loadedScriptIds.push(script.id);
			emitLifecycleEvent(
				script,
				'loaded',
				'Callback-only script marked as loaded',
				callbackInfo,
				{
					callbackOnly: true,
				}
			);
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
					hasConsent,
					elementId,
					consents,
					element: existingElement,
				};

				emitLifecycleEvent(
					script,
					'already_loaded',
					'Persisted script element already exists; reusing it',
					callbackInfo,
					{
						reason: 'persisted_element',
					}
				);
				invokeScriptCallback(
					script,
					'onConsentChange',
					script.onConsentChange,
					callbackInfo
				);
				invokeScriptCallback(script, 'onLoad', script.onLoad, callbackInfo);

				// Track the script as loaded
				setLoadedScript(script.id, existingElement);
				loadedScriptIds.push(script.id);
				emitLifecycleEvent(
					script,
					'loaded',
					'Existing script element marked as loaded',
					callbackInfo,
					{
						reusedElement: true,
					}
				);
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
			hasConsent,
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
					invokeScriptCallback(script, 'onLoad', script.onLoad, {
						...callbackInfo,
					});
				}, 0);
			} else {
				// For src-based scripts, listen for the load event
				emitLifecycleEvent(
					script,
					'load_listener_attached',
					'Attached load listener',
					callbackInfo
				);
				scriptElement.addEventListener('load', () => {
					invokeScriptCallback(script, 'onLoad', script.onLoad, {
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
				emitLifecycleEvent(
					script,
					'error_listener_attached',
					'Attached error listener',
					callbackInfo
				);
				scriptElement.addEventListener('error', () => {
					invokeScriptCallback(script, 'onError', script.onError, {
						...callbackInfo,
						error: new Error(`Failed to load script: ${script.src}`),
					});
				});
			}
		}

		invokeScriptCallback(
			script,
			'onBeforeLoad',
			script.onBeforeLoad,
			callbackInfo
		);

		// Determine target location (default to 'head')
		const target = script.target ?? 'head';
		const targetElement = target === 'body' ? document.body : document.head;

		// Validate target element exists
		if (!targetElement) {
			throw new Error(
				`Document ${target} is not available for script injection`
			);
		}

		// Add to document and track
		targetElement.appendChild(scriptElement);
		emitLifecycleEvent(
			script,
			'element_appended',
			`Script element appended to ${target}`,
			callbackInfo,
			{
				target,
			}
		);
		setLoadedScript(script.id, scriptElement);
		loadedScriptIds.push(script.id);
		emitLifecycleEvent(
			script,
			'loaded',
			'Script marked as loaded',
			callbackInfo
		);
	});

	return loadedScriptIds;
}

/**
 * Unloads scripts that no longer have consent.
 *
 * @param scripts - Array of script configurations to check
 * @param consents - Current user consent state
 * @param scriptIdMap - Map of anonymized script IDs to original IDs
 * @param options - Additional options including IAB consent state
 * @returns Array of script IDs that were unloaded
 *
 * @remarks
 * The unloading process follows these steps:
 * 1. Check if the script is loaded
 * 2. Skip if script has alwaysLoad enabled (these scripts are never unloaded)
 * 3. Check if the script no longer has consent
 * 4. Remove the script from the document
 * 5. Remove the script from tracking
 *
 * Scripts with `alwaysLoad: true` will never be unloaded, even if consent is revoked.
 *
 * Note: When `reloadOnConsentRevoked` is enabled (default), this function may not
 * be called for consent revocation as the page will reload instead.
 *
 * In IAB mode, scripts with vendorId or iabPurposes will use IAB consent checks.
 *
 * @public
 */
export function unloadScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {},
	options?: ScriptLoaderOptions
): string[] {
	const unloadedScriptIds: string[] = [];

	scripts.forEach((script) => {
		const hasConsent = scriptHasConsent(script, consents, options);

		// Skip if script is not loaded
		if (!hasLoadedScript(script.id)) {
			return;
		}

		// Skip if script has alwaysLoad enabled (never unload these scripts)
		if (script.alwaysLoad) {
			return;
		}

		// Check if script no longer has consent
		if (!hasConsent) {
			const scriptElement = getLoadedScript(script.id);
			const callbackInfo: Partial<ScriptCallbackInfo> = {
				id: script.id,
				elementId: getScriptElementId(
					script.id,
					script.anonymizeId !== false,
					scriptIdMap
				),
				hasConsent,
				consents,
				element:
					scriptElement && scriptElement !== null ? scriptElement : undefined,
			};

			// Handle callback-only scripts
			if (script.callbackOnly === true || scriptElement === null) {
				// Remove from tracking
				deleteLoadedScript(script.id);
				unloadedScriptIds.push(script.id);
				emitLifecycleEvent(
					script,
					'unloaded',
					'Callback-only script marked as unloaded',
					callbackInfo,
					{
						callbackOnly: true,
					}
				);
			}
			// Handle standard scripts with DOM elements
			else if (scriptElement) {
				// Only remove from DOM if persistAfterConsentRevoked is not true
				if (!script.persistAfterConsentRevoked) {
					scriptElement.remove();
					// Remove from tracking
					deleteLoadedScript(script.id);
					unloadedScriptIds.push(script.id);
					emitLifecycleEvent(
						script,
						'unloaded',
						'Script element removed after consent revocation',
						callbackInfo,
						{
							removedElement: true,
						}
					);
				}
				// If persistAfterConsentRevoked is true, keep the script in DOM but still track as unloaded
				else {
					deleteLoadedScript(script.id);
					unloadedScriptIds.push(script.id);
					emitLifecycleEvent(
						script,
						'unloaded',
						'Persistent script marked as unloaded without removing element',
						callbackInfo,
						{
							removedElement: false,
							persistAfterConsentRevoked: true,
						}
					);
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
 * @param options - Additional options including IAB consent state
 * @returns Object containing arrays of loaded and unloaded script IDs
 *
 * @remarks
 * When anonymizeId is enabled (default), script elements will use randomly generated IDs
 * instead of the original script IDs prefixed with 'c15t-script-'.
 *
 * In IAB mode, scripts with vendorId or iabPurposes will use IAB consent checks.
 *
 * @public
 */
export function updateScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {},
	options?: ScriptLoaderOptions
): ScriptUpdateResult {
	const unloaded = unloadScripts(scripts, consents, scriptIdMap, options);
	const loaded = loadScripts(scripts, consents, scriptIdMap, options);

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
 * @param scripts - Optional array of script configurations to check for alwaysLoad
 * @returns Array of script IDs that were unloaded
 *
 * @remarks
 * Scripts with `alwaysLoad: true` will be skipped and remain loaded.
 *
 * @public
 */
export function clearAllScripts(scripts?: Script[]): string[] {
	const unloadedScriptIds: string[] = [];

	getLoadedScriptsSnapshot().forEach((scriptElement, id) => {
		// Skip if script has alwaysLoad enabled (never unload these scripts)
		if (scripts) {
			const script = scripts.find((s) => s.id === id);
			if (script?.alwaysLoad) {
				return;
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
 * @param options - Additional options including IAB consent state
 * @returns True if the script was reloaded, false otherwise
 *
 * @public
 */
export function reloadScript(
	scriptId: string,
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap: Record<string, string> = {},
	options?: ScriptLoaderOptions
): boolean {
	const script = scripts.find((s) => s.id === scriptId);

	if (!script) {
		return false;
	}

	// Remove the script if it's loaded
	if (hasLoadedScript(scriptId)) {
		const scriptElement = getLoadedScript(scriptId);

		// Handle callback-only scripts
		if (script.callbackOnly === true || scriptElement === null) {
			deleteLoadedScript(scriptId);
		}
		// Handle standard scripts with DOM elements
		else if (scriptElement) {
			// Only remove from DOM if persistAfterConsentRevoked is not true
			if (!script.persistAfterConsentRevoked) {
				scriptElement.remove();
			}

			deleteLoadedScript(scriptId);
		}
	}

	// Check if the script has consent before reloading (unless alwaysLoad is true)
	if (!script.alwaysLoad && !scriptHasConsent(script, consents, options)) {
		emitLifecycleEvent(
			script,
			'skipped',
			'Reload skipped due to missing consent',
			{
				hasConsent: false,
				elementId: getScriptElementId(
					script.id,
					script.anonymizeId !== false,
					scriptIdMap
				),
			},
			{
				reason: 'reload_missing_consent',
			}
		);
		return false;
	}

	// Load the script
	loadScripts([script], consents, scriptIdMap, options);
	return true;
}
