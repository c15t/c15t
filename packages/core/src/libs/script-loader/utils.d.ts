/**
 * Generates a random ID for script elements.
 *
 * @returns A random string that can be used as a script ID
 * @internal
 */
export declare function generateRandomScriptId(): string;
/**
 * Creates a DOM element ID for a script based on its ID and anonymization settings.
 *
 * @param scriptId - The original script ID
 * @param anonymizeId - Whether to use an anonymized ID
 * @param scriptIdMap - Map of script IDs to anonymized IDs
 * @returns The element ID to use for the script
 * @internal
 */
export declare function getScriptElementId(
	scriptId: string,
	anonymizeId: boolean,
	scriptIdMap: Record<string, string>
): string;
/**
 * Check if a script with the given ID has been loaded
 * @param src - The script source URL
 * @returns True if the script has been loaded
 * @internal
 */
export declare function hasLoadedScript(src: string): boolean;
/**
 * Get a loaded script element by its source URL
 * @param src - The script source URL
 * @returns The script element or null if not found
 * @internal
 */
export declare function getLoadedScript(
	src: string
): HTMLScriptElement | null | undefined;
/**
 * Set a loaded script element in the registry
 * @param src - The script source URL
 * @param element - The script element or null
 * @internal
 */
export declare function setLoadedScript(
	src: string,
	element: HTMLScriptElement | null
): void;
/**
 * Remove a script from the loaded scripts registry
 * @param src - The script source URL
 * @internal
 */
export declare function deleteLoadedScript(src: string): void;
/**
 * Clear all loaded scripts from the registry
 * @internal
 */
export declare function clearLoadedScripts(): void;
/**
 * Get a readonly snapshot of all loaded scripts
 * @returns A readonly map of loaded scripts
 * @internal
 */
export declare function getLoadedScriptsSnapshot(): ReadonlyMap<
	string,
	HTMLScriptElement | null
>;
