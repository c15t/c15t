/**
 * Generates a random ID for script elements.
 *
 * @returns A random string that can be used as a script ID
 * @internal
 */
export function generateRandomScriptId(): string {
	// Generate a random string of exactly 8 characters
	// Prefer secure randomness if available
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		// Use crypto.randomUUID and take first 8 characters
		return crypto.randomUUID().replace(/-/g, '').substring(0, 8);
	}

	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		// Use crypto.getRandomValues to generate random bytes
		const array = new Uint8Array(4);
		crypto.getRandomValues(array);
		return Array.from(array, (byte) => byte.toString(36))
			.join('')
			.padEnd(8, '0')
			.substring(0, 8);
	}

	// Fallback to Math.random with padding to ensure 8 characters
	const randomStr = Math.random().toString(36).substring(2);
	return randomStr.padEnd(8, '0').substring(0, 8);
}

/**
 * Creates a DOM element ID for a script based on its ID and anonymization settings.
 *
 * @param scriptId - The original script ID
 * @param anonymizeId - Whether to use an anonymized ID
 * @param scriptIdMap - Map of script IDs to anonymized IDs
 * @returns The element ID to use for the script
 * @internal
 */
export function getScriptElementId(
	scriptId: string,
	anonymizeId: boolean,
	scriptIdMap: Record<string, string>
): string {
	if (anonymizeId) {
		// Use existing anonymized ID if available
		if (scriptIdMap[scriptId]) {
			return scriptIdMap[scriptId];
		}

		// Generate a new anonymized ID if not found
		scriptIdMap[scriptId] = generateRandomScriptId();
		return scriptIdMap[scriptId];
	}

	// Use a predictable ID format if anonymization is disabled
	return `c15t-script-${scriptId}`;
}

/**
 * Map of loaded scripts by their ID
 * For callback-only scripts, the value will be null
 *
 * @internal
 */
const loadedScripts = new Map<string, HTMLScriptElement | null>();

/**
 * Check if a script with the given ID has been loaded
 * @param src - The script source URL
 * @returns True if the script has been loaded
 * @internal
 */
export function hasLoadedScript(src: string): boolean {
	return loadedScripts.has(src);
}

/**
 * Get a loaded script element by its source URL
 * @param src - The script source URL
 * @returns The script element or null if not found
 * @internal
 */
export function getLoadedScript(
	src: string
): HTMLScriptElement | null | undefined {
	return loadedScripts.get(src);
}

/**
 * Set a loaded script element in the registry
 * @param src - The script source URL
 * @param element - The script element or null
 * @internal
 */
export function setLoadedScript(
	src: string,
	element: HTMLScriptElement | null
): void {
	loadedScripts.set(src, element);
}

/**
 * Remove a script from the loaded scripts registry
 * @param src - The script source URL
 * @internal
 */
export function deleteLoadedScript(src: string): void {
	loadedScripts.delete(src);
}

/**
 * Clear all loaded scripts from the registry
 * @internal
 */
export function clearLoadedScripts(): void {
	loadedScripts.clear();
}

/**
 * Get a readonly snapshot of all loaded scripts
 * @returns A readonly map of loaded scripts
 * @internal
 */
export function getLoadedScriptsSnapshot(): ReadonlyMap<
	string,
	HTMLScriptElement | null
> {
	return loadedScripts;
}
