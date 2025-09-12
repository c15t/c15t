/**
 * Generates a random ID for script elements.
 *
 * @returns A random string that can be used as a script ID
 * @internal
 */
export function generateRandomScriptId(): string {
	// Generate a random string of 8 characters
	return Math.random().toString(36).substring(2, 10);
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
export const loadedScripts = new Map<string, HTMLScriptElement | null>();
