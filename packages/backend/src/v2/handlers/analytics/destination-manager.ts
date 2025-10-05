/**
 * @fileoverview Simple destination manager for c15t analytics.
 * Manages lazy-loaded destinations from @c15t/destinations package.
 */

import { destinationPlugins } from '../../plugins/destination-registry';
import type {
	AnalyticsDestination,
	DestinationConfig,
	DestinationFactory,
} from './core-types';
import {
	loadDestinationFactory,
	validateDestinationsAvailable,
} from './destination-loader';
import type { AnalyticsConsent, AnalyticsEvent } from './types';
import { validateDestinationRegistry } from './validation';

/**
 * Simple destination manager that lazy loads destinations.
 */
export class DestinationManager {
	private destinations = new Map<string, AnalyticsDestination>();
	private factories = new Map<string, DestinationFactory>();

	constructor(registry?: Record<string, DestinationFactory>) {
		// Use provided registry or fall back to global plugins
		const sourceRegistry = registry || destinationPlugins.getPlugins();

		// Validate the registry
		const validatedRegistry = validateDestinationRegistry(sourceRegistry);

		// Load validated factories
		for (const [type, factory] of Object.entries(validatedRegistry)) {
			this.factories.set(type, factory);
		}

		console.log(
			`[DestinationManager] Loaded ${this.factories.size} destination factories:`,
			Array.from(this.factories.keys()).join(', ')
		);
	}

	/**
	 * Validates that all required destinations are available before loading
	 *
	 * @param configs - Array of destination configurations to validate
	 * @throws {Error} When destinations package is not installed or destinations are missing
	 */
	private async validateDestinations(
		configs: DestinationConfig[]
	): Promise<void> {
		const enabledTypes = configs
			.filter((config) => config.enabled)
			.map((config) => config.type);

		if (enabledTypes.length === 0) {
			return; // No destinations to validate
		}

		const isValid = await validateDestinationsAvailable(enabledTypes);
		if (!isValid) {
			throw new Error(
				'Some required destinations are not available. ' +
					`Please ensure @c15t/destinations package is installed and contains: ${enabledTypes.join(', ')}`
			);
		}
	}

	/**
	 * Load destinations from configuration.
	 *
	 * @param configs - Array of destination configurations
	 */
	async loadDestinations(configs: DestinationConfig[]): Promise<void> {
		// Validate all destinations are available before attempting to load
		await this.validateDestinations(configs);

		const loadPromises = configs.map(async (config) => {
			if (!config.enabled) {
				console.log(
					`[DestinationManager] Skipping disabled destination: ${config.type}`
				);
				return;
			}

			try {
				// Get or load factory for this destination type
				let factory = this.factories.get(config.type);

				if (!factory) {
					// Use type-safe loader
					factory = await loadDestinationFactory(config.type);
					if (!factory) {
						throw new Error(
							`Destination type '${config.type}' not found. ` +
								'This should not happen after validation - please report this issue.'
						);
					}
					// Cache the factory for future use
					this.factories.set(config.type, factory);
				}

				// Create destination with settings (validation handled by destination)
				const destination = await factory(config.settings);
				this.destinations.set(config.type, destination);

				console.log(
					`✅ [DestinationManager] Loaded destination: ${config.type}`
				);
			} catch (error: unknown) {
				console.error(
					`❌ [DestinationManager] Failed to load destination '${config.type}':`,
					error
				);
				throw error; // Throw to fail fast on validation errors
			}
		});

		await Promise.all(loadPromises);

		console.log(
			`[DestinationManager] Successfully loaded ${this.destinations.size} destinations`
		);
	}

	/**
	 * Process analytics events through all loaded destinations.
	 *
	 * @param events - Array of analytics events to process
	 * @param consent - Current consent state
	 */
	async processEvents(
		events: AnalyticsEvent[],
		consent: AnalyticsConsent
	): Promise<void> {
		const processingPromises: Promise<void>[] = [];

		for (const destination of this.destinations.values()) {
			// Process events through this destination
			for (const event of events) {
				const promise = destination.sendEvent(event, consent).catch((error) => {
					console.error(`Failed to send event to ${destination.type}:`, error);
					// Don't throw - continue processing other destinations
				});
				processingPromises.push(promise);
			}
		}

		// Wait for all processing to complete
		await Promise.all(processingPromises);
	}

	/**
	 * Test connections for all loaded destinations.
	 *
	 * @returns Array of connection test results
	 */
	async testConnections(): Promise<
		Array<{
			type: string;
			status: 'connected' | 'disconnected' | 'error';
			error?: string;
		}>
	> {
		const results: Array<{
			type: string;
			status: 'connected' | 'disconnected' | 'error';
			error?: string;
		}> = [];

		for (const destination of this.destinations.values()) {
			try {
				const isConnected = await destination.testConnection();
				results.push({
					type: destination.type,
					status: isConnected ? 'connected' : 'disconnected',
				});
			} catch (error: unknown) {
				results.push({
					type: destination.type,
					status: 'error',
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		return results;
	}

	/**
	 * Get all loaded destination types.
	 *
	 * @returns Array of loaded destination type identifiers
	 */
	getLoadedDestinations(): string[] {
		return Array.from(this.destinations.keys());
	}

	/**
	 * Clear all loaded destinations.
	 */
	clear(): void {
		this.destinations.clear();
	}
}
