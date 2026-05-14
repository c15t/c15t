import type { ConsentState } from '../../types/compliance';
import type { Model } from '../determine-model';
import type { Script, ScriptUpdateResult } from './types';
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
export declare function loadScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap?: Record<string, string>,
	options?: ScriptLoaderOptions
): string[];
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
export declare function unloadScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap?: Record<string, string>,
	options?: ScriptLoaderOptions
): string[];
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
export declare function updateScripts(
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap?: Record<string, string>,
	options?: ScriptLoaderOptions
): ScriptUpdateResult;
/**
 * Checks if a script is currently loaded.
 *
 * @param scriptId - ID of the script to check
 * @returns True if the script is loaded, false otherwise
 *
 * @public
 */
export declare function isScriptLoaded(scriptId: string): boolean;
/**
 * Gets all currently loaded script IDs.
 *
 * @returns Array of loaded script IDs
 *
 * @public
 */
export declare function getLoadedScriptIds(): string[];
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
export declare function clearAllScripts(scripts?: Script[]): string[];
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
export declare function reloadScript(
	scriptId: string,
	scripts: Script[],
	consents: ConsentState,
	scriptIdMap?: Record<string, string>,
	options?: ScriptLoaderOptions
): boolean;
