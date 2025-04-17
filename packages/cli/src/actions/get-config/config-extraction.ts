import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';

// Define the shape of the config object expected by c12
type MaybeC15TOptions = Partial<C15TOptions>; // Allow options obj shape
type MaybeClientOptions = Partial<ConsentManagerOptions>; // Allow client options shape
type MaybeC15TFunc = (...args: unknown[]) => unknown; // Use unknown for better type safety

export type LoadedConfig = {
	c15t?: MaybeC15TOptions | MaybeC15TFunc | { options?: MaybeC15TOptions };
	default?: MaybeC15TOptions | MaybeC15TFunc | { options?: MaybeC15TOptions };
	c15tInstance?:
		| MaybeC15TOptions
		| MaybeC15TFunc
		| { options?: MaybeC15TOptions };
	c15tConfig?: MaybeClientOptions;
	c15tOptions?: MaybeClientOptions; // Add additional common export name
	consent?: MaybeC15TOptions | MaybeC15TFunc | { options?: MaybeC15TOptions };
	instance?: { options?: MaybeC15TOptions }; // instance less likely to be func/direct options
	config?: { options?: MaybeC15TOptions };

	// Use unknown for other potential exports - safer than any
	[key: string]: unknown;
};

// Type guard to check if an object looks like C15TOptions
export function isC15TOptions(obj: unknown): obj is C15TOptions {
	return typeof obj === 'object' && obj !== null && 'appName' in obj;
}

// Type guard to check if an object looks like ConsentManagerOptions
export function isClientOptions(obj: unknown): obj is ConsentManagerOptions {
	return typeof obj === 'object' && obj !== null && ('mode' in obj || 'backendURL' in obj);
}

/**
 * Extract c15t options from a loaded config object.
 * Looks for various common export names for the c15t instance or options.
 */
export function extractOptionsFromConfig(
	config: LoadedConfig
): C15TOptions | ConsentManagerOptions | null {
	// Debug what exports we're getting
	console.debug('Available exports in config:', Object.keys(config));
	
	// First check for client configuration
	if (config.c15tConfig && isClientOptions(config.c15tConfig)) {
		console.debug('Found valid c15tConfig export');
		return config.c15tConfig;
	}
	
	// Check alternate client config name
	if (config.c15tOptions && isClientOptions(config.c15tOptions)) {
		console.debug('Found valid c15tOptions export');
		return config.c15tOptions;
	}

	// Check if the entire module is a valid client config
	if (isClientOptions(config)) {
		console.debug('Found valid client config in the module itself');
		return config as unknown as ConsentManagerOptions;
	}

	// Then check for server configuration
	if (isC15TOptions(config.c15t)) {
		return config.c15t;
	}
	
	if (isC15TOptions(config.default)) {
		return config.default;
	}
	
	if (isC15TOptions(config.c15tInstance)) {
		return config.c15tInstance;
	}
	
	if (isC15TOptions(config.consent)) {
		return config.consent;
	}

	// Fallback to checking nested options properties
	if (
		typeof config.c15t === 'object' &&
		config.c15t !== null &&
		isC15TOptions(config.c15t.options)
	) {
		return config.c15t.options;
	}
	if (
		typeof config.default === 'object' &&
		config.default !== null &&
		isC15TOptions(config.default.options)
	) {
		return config.default.options;
	}
	if (
		typeof config.c15tInstance === 'object' &&
		config.c15tInstance !== null &&
		isC15TOptions(config.c15tInstance.options)
	) {
		return config.c15tInstance.options;
	}
	if (
		typeof config.instance === 'object' &&
		config.instance !== null &&
		isC15TOptions(config.instance.options)
	) {
		return config.instance.options;
	}
	if (
		typeof config.consent === 'object' &&
		config.consent !== null &&
		isC15TOptions(config.consent.options)
	) {
		return config.consent.options;
	}
	if (
		typeof config.config === 'object' &&
		config.config !== null &&
		isC15TOptions(config.config.options)
	) {
		return config.config.options;
	}

	// If we get here, we couldn't find a valid config
	console.debug('No valid configuration found in any of the expected locations');
	return null;
}
