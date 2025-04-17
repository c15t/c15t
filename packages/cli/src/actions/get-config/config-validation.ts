import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';
// Import the type guards
import { isC15TOptions, isClientOptions } from './config-extraction';

/**
 * Validate the extracted config object (either client or backend).
 */
export function validateConfig(
	config: C15TOptions | ConsentManagerOptions | null
): boolean {
	if (!config) {
		return false;
	}

	if (isClientOptions(config)) {
		// Basic validation for client options: check for 'mode'
		const isValidClient = typeof config.mode === 'string';
		if (!isValidClient) {
			console.warn(
				"Warning: Invalid client configuration object detected (missing or invalid 'mode')."
			);
		}
		return isValidClient;
	}

	if (isC15TOptions(config)) {
		// Basic validation for backend options: check for 'appName'
		const isValidBackend = typeof config.appName === 'string';
		if (!isValidBackend) {
			console.warn(
				"Warning: Invalid backend configuration object detected (missing or invalid 'appName')."
			);
		}
		return isValidBackend;
	}

	// If it's neither, it's invalid
	console.warn('Warning: Unknown configuration object type detected.');
	return false;
}
