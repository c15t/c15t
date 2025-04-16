import type { C15TOptions } from '@c15t/backend';

/**
 * Validate the extracted config object.
 */
export function validateConfig(config: C15TOptions | null): boolean {
	if (!config) {
		return false;
	}

	// Basic validation - ensure it's an object and has a minimal required property.
	// This is a basic check; more specific validation could be added.
	const isValid =
		typeof config === 'object' && config !== null && 'appName' in config;

	if (!isValid) {
		// Optionally log a warning or provide more specific feedback
		// console.warn('Warning: Invalid configuration object detected.');
	}

	return isValid;
}
