/**
 * @fileoverview Plugin registration system for c15t analytics destinations.
 * Allows users to register destination plugins before creating c15tInstance.
 */

import type { DestinationFactory } from '../handlers/analytics/core-types';

/**
 * Global registry for destination plugins.
 */
class DestinationPluginRegistry {
	private plugins = new Map<string, DestinationFactory>();

	/**
	 * Register a destination plugin.
	 *
	 * @param type - Destination type identifier
	 * @param factory - Factory function to create destination instances
	 */
	register(type: string, factory: DestinationFactory): void {
		this.plugins.set(type, factory);
		console.log(`[c15t] Registered destination plugin: ${type}`);
	}

	/**
	 * Get all registered plugins.
	 */
	getPlugins(): Map<string, DestinationFactory> {
		return new Map(this.plugins);
	}

	/**
	 * Check if a plugin is registered.
	 */
	hasPlugin(type: string): boolean {
		return this.plugins.has(type);
	}

	/**
	 * Clear all registered plugins.
	 */
	clear(): void {
		this.plugins.clear();
	}
}

/**
 * Global plugin registry instance.
 */
export const destinationPlugins = new DestinationPluginRegistry();

/**
 * Register a destination plugin.
 *
 * @param type - Destination type identifier
 * @param factory - Factory function to create destination instances
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
 * Get all registered destination plugins.
 */
export function getRegisteredDestinations(): Map<string, DestinationFactory> {
	return destinationPlugins.getPlugins();
}
