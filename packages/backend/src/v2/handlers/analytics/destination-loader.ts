/**
 * Fully dynamic destination factory loader with runtime type inference
 * No hardcoded destination types - everything is discovered at runtime
 */

import type { DestinationFactory } from './core-types';

/**
 * Runtime validation for destination factory functions
 */
function isValidDestinationFactory(
	factory: unknown
): factory is DestinationFactory {
	return (
		typeof factory === 'function' &&
		factory.length === 1 && // Should accept settings parameter
		factory.name.startsWith('create') &&
		factory.name.endsWith('Destination')
	);
}

/**
 * Extracts destination type from factory function name
 *
 * @param factoryName - The factory function name (e.g., 'createPostHogDestination')
 * @returns The destination type (e.g., 'posthog')
 *
 * @example
 * ```ts
 * const type = extractDestinationType('createPostHogDestination'); // 'posthog'
 * const type2 = extractDestinationType('createGoogleAnalyticsDestination'); // 'google-analytics'
 * ```
 */
function extractDestinationType(factoryName: string): string {
	// Remove 'create' prefix and 'Destination' suffix
	const withoutPrefix = factoryName.replace(/^create/, '');
	const withoutSuffix = withoutPrefix.replace(/Destination$/, '');

	// Convert PascalCase to kebab-case
	return withoutSuffix
		.replace(/([A-Z])/g, '-$1')
		.toLowerCase()
		.replace(/^-/, ''); // Remove leading dash
}

/**
 * Type-safe destination module interface
 */
interface DestinationsModule {
	[key: string]: unknown;
	destinationRegistry?: Record<string, DestinationFactory>;
}

/**
 * Discovers all available destination factories from the destinations module
 *
 * @param destinationsModule - The imported destinations module
 * @returns Map of destination types to their factory functions
 *
 * @example
 * ```ts
 * const module = await import('@c15t/destinations');
 * const factories = discoverDestinationFactories(module);
 * // factories = { 'console': factory1, 'posthog': factory2, ... }
 * ```
 */
function discoverDestinationFactories(
	destinationsModule: DestinationsModule
): Record<string, DestinationFactory> {
	const factories: Record<string, DestinationFactory> = {};

	// First, try to use the registry if available
	if (destinationsModule.destinationRegistry) {
		Object.entries(destinationsModule.destinationRegistry).forEach(
			([type, factory]) => {
				if (isValidDestinationFactory(factory)) {
					factories[type] = factory;
				}
			}
		);
	}

	// Then, discover individual factory functions
	Object.entries(destinationsModule).forEach(([key, value]) => {
		if (key.startsWith('create') && key.endsWith('Destination')) {
			if (isValidDestinationFactory(value)) {
				const destinationType = extractDestinationType(key);
				factories[destinationType] = value;
			}
		}
	});

	return factories;
}

/**
 * Loads a destination factory with full type safety and runtime validation
 *
 * @param destinationType - The type of destination to load
 * @returns Promise resolving to the destination factory or undefined if not found
 *
 * @throws {Error} When the destinations package is not installed
 * @throws {Error} When the destination type is not supported
 * @throws {Error} When the factory function is invalid
 *
 * @example
 * ```ts
 * const factory = await loadDestinationFactory('posthog');
 * if (factory) {
 *   const destination = await factory({ apiKey: 'xxx' });
 * }
 * ```
 */
export async function loadDestinationFactory(
	destinationType: string
): Promise<DestinationFactory | undefined> {
	try {
		// Dynamic import with proper typing
		const destinationsModule = (await import(
			'@c15t/destinations'
		)) as DestinationsModule;

		// Discover all available factories
		const availableFactories = discoverDestinationFactories(destinationsModule);

		// Check if the requested destination is available
		const factory = availableFactories[destinationType];

		if (!factory) {
			const availableTypes = Object.keys(availableFactories).join(', ');
			console.warn(
				`[DestinationLoader] Destination type '${destinationType}' not found. ` +
					`Available types: ${availableTypes || 'none'}`
			);
			return undefined;
		}

		console.log(
			`[DestinationLoader] Successfully loaded factory: ${destinationType}`
		);
		return factory;
	} catch (error) {
		// Handle module not found
		if (
			error instanceof Error &&
			error.message.includes('Cannot resolve module')
		) {
			throw new Error(
				'@c15t/destinations package not found. ' +
					'Please install it to use server-side analytics: npm install @c15t/destinations'
			);
		}

		// Re-throw other errors
		throw error;
	}
}

/**
 * Loads multiple destination factories with validation
 *
 * @param destinationTypes - Array of destination types to load
 * @returns Promise resolving to a map of loaded factories
 *
 * @example
 * ```ts
 * const factories = await loadDestinationFactories(['posthog', 'console']);
 * // factories = { posthog: factory1, console: factory2 }
 * ```
 */
export async function loadDestinationFactories(
	destinationTypes: string[]
): Promise<Record<string, DestinationFactory>> {
	const factories: Record<string, DestinationFactory> = {};

	const loadPromises = destinationTypes.map(async (type) => {
		try {
			const factory = await loadDestinationFactory(type);
			if (factory) {
				factories[type] = factory;
			}
		} catch (error) {
			console.error(`[DestinationLoader] Failed to load ${type}:`, error);
		}
	});

	await Promise.all(loadPromises);

	console.log(
		`[DestinationLoader] Loaded ${Object.keys(factories).length}/${destinationTypes.length} destination factories`
	);

	return factories;
}

/**
 * Gets all available destination types from the destinations package
 *
 * @returns Promise resolving to array of available destination types
 *
 * @example
 * ```ts
 * const availableTypes = await getAvailableDestinationTypes();
 * // ['console', 'posthog', 'mixpanel', 'google-analytics']
 * ```
 */
export async function getAvailableDestinationTypes(): Promise<string[]> {
	try {
		const destinationsModule = (await import(
			'@c15t/destinations'
		)) as DestinationsModule;
		const availableFactories = discoverDestinationFactories(destinationsModule);
		return Object.keys(availableFactories);
	} catch (error) {
		console.error(
			'[DestinationLoader] Failed to get available destination types:',
			error
		);
		return [];
	}
}

/**
 * Validates that all required destination types are available
 *
 * @param destinationTypes - Array of destination types to validate
 * @returns Promise resolving to true if all destinations are available
 *
 * @example
 * ```ts
 * const isValid = await validateDestinationsAvailable(['posthog', 'console']);
 * if (!isValid) {
 *   throw new Error('Some destinations are not available');
 * }
 * ```
 */
export async function validateDestinationsAvailable(
	destinationTypes: string[]
): Promise<boolean> {
	try {
		const destinationsModule = (await import(
			'@c15t/destinations'
		)) as DestinationsModule;
		const availableFactories = discoverDestinationFactories(destinationsModule);

		const missingTypes = destinationTypes.filter(
			(type) => !availableFactories[type]
		);

		if (missingTypes.length > 0) {
			const availableTypes = Object.keys(availableFactories).join(', ');
			console.error(
				`[DestinationLoader] Missing destination types: ${missingTypes.join(', ')}. ` +
					`Available types: ${availableTypes || 'none'}`
			);
			return false;
		}

		return true;
	} catch (error) {
		console.error(
			'[DestinationLoader] Failed to validate destinations:',
			error
		);
		return false;
	}
}
