/**
 * @fileoverview Plugin registration system for c15t analytics destinations.
 * Allows users to register destination plugins before creating c15tInstance.
 */

import type { DestinationFactory } from '../handlers/analytics/core-types';

/**
 * Global registry for destination plugins.
 *
 * @internal
 * This class manages the registration and retrieval of destination factory functions.
 * It provides thread-safe access to destination plugins and supports both
 * eager and lazy loading patterns.
 */
class DestinationPluginRegistry {
	private plugins = new Map<string, DestinationFactory>();

	/**
	 * Register a destination plugin factory.
	 *
	 * @param type - Destination type identifier (e.g., 'posthog', 'console')
	 * @param factory - Factory function to create destination instances
	 *
	 * @throws {Error} When attempting to register a duplicate destination type
	 *
	 * @example
	 * ```typescript
	 * registry.register('posthog', async (settings) => {
	 *   return new PostHogDestination(settings);
	 * });
	 * ```
	 */
	register(type: string, factory: DestinationFactory): void {
		if (this.plugins.has(type)) {
			throw new Error(`Destination type '${type}' is already registered`);
		}

		this.plugins.set(type, factory);
		console.log(`[c15t] Registered destination plugin: ${type}`);
	}

	/**
	 * Get a destination factory by type.
	 *
	 * @param type - Destination type identifier
	 * @returns Factory function or undefined if not found
	 */
	get(type: string): DestinationFactory | undefined {
		return this.plugins.get(type);
	}

	/**
	 * Get all registered plugins as a Map.
	 *
	 * @returns Copy of the plugins map for safe iteration
	 */
	getPlugins(): Map<string, DestinationFactory> {
		return new Map(this.plugins);
	}

	/**
	 * Check if a plugin is registered.
	 *
	 * @param type - Destination type identifier
	 * @returns True if plugin is registered
	 */
	hasPlugin(type: string): boolean {
		return this.plugins.has(type);
	}

	/**
	 * Get all registered destination types.
	 *
	 * @returns Array of registered destination type identifiers
	 */
	getRegisteredTypes(): string[] {
		return Array.from(this.plugins.keys());
	}

	/**
	 * Get the count of registered plugins.
	 *
	 * @returns Number of registered destination plugins
	 */
	getPluginCount(): number {
		return this.plugins.size;
	}

	/**
	 * Clear all registered plugins.
	 *
	 * @warning This will remove all registered destinations
	 */
	clear(): void {
		this.plugins.clear();
		console.log('[c15t] Cleared all destination plugins');
	}
}

/**
 * Global plugin registry instance.
 */
export const destinationPlugins = new DestinationPluginRegistry();

/**
 * Register a destination plugin factory.
 *
 * @param type - Destination type identifier (e.g., 'posthog', 'console')
 * @param factory - Factory function to create destination instances
 *
 * @throws {Error} When attempting to register a duplicate destination type
 *
 * @example
 * ```typescript
 * import { registerDestination } from '@c15t/backend/v2';
 * import { createPostHogDestination } from '@c15t/destinations';
 *
 * registerDestination('posthog', createPostHogDestination);
 * ```
 */
export function registerDestination(
	type: string,
	factory: DestinationFactory
): void {
	destinationPlugins.register(type, factory);
}

/**
 * Get a destination factory by type.
 *
 * @param type - Destination type identifier
 * @returns Factory function or undefined if not found
 *
 * @example
 * ```typescript
 * const factory = getDestinationFactory('posthog');
 * if (factory) {
 *   const destination = await factory(settings);
 * }
 * ```
 */
export function getDestinationFactory(
	type: string
): DestinationFactory | undefined {
	return destinationPlugins.get(type);
}

/**
 * Get all registered destination plugins.
 *
 * @returns Copy of the plugins map for safe iteration
 */
export function getRegisteredDestinations(): Map<string, DestinationFactory> {
	return destinationPlugins.getPlugins();
}

/**
 * Check if a destination plugin is registered.
 *
 * @param type - Destination type identifier
 * @returns True if plugin is registered
 */
export function hasDestinationPlugin(type: string): boolean {
	return destinationPlugins.hasPlugin(type);
}

/**
 * Get all registered destination types.
 *
 * @returns Array of registered destination type identifiers
 */
export function getRegisteredDestinationTypes(): string[] {
	return destinationPlugins.getRegisteredTypes();
}

/**
 * Get the count of registered destination plugins.
 *
 * @returns Number of registered destination plugins
 */
export function getDestinationPluginCount(): number {
	return destinationPlugins.getPluginCount();
}
