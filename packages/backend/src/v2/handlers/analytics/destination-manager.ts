/**
 * @fileoverview Destination manager for c15t analytics.
 * Manages destination lifecycle, event processing, and error handling.
 */

import type { Logger } from '@doubletie/logger';
import { destinationPlugins } from '../../plugins/destination-registry';
import type {
	AliasEvent as AnalyticsAliasEvent,
	AnalyticsConsent,
	ConsentEvent as AnalyticsConsentEvent,
	AnalyticsEvent,
	GroupEvent as AnalyticsGroupEvent,
	IdentifyEvent as AnalyticsIdentifyEvent,
	PageEvent as AnalyticsPageEvent,
	TrackEvent as AnalyticsTrackEvent,
	ConsentPurpose,
	DestinationConfig,
	DestinationFactory,
	DestinationPlugin,
	EventContext,
	SpecificAnalyticsEvent,
} from './core-types';
import {
	loadDestinationFactory,
	validateDestinationsAvailable,
} from './destination-loader';
import { validateDestinationRegistry } from './validation';

/**
 * Represents a loaded destination instance with its configuration and state.
 *
 * @internal
 * This interface encapsulates a destination plugin along with its configuration
 * and runtime state for efficient management and error tracking.
 */
export interface DestinationInstance {
	/** The destination plugin instance */
	readonly plugin: DestinationPlugin;
	/** The configuration used to create this instance */
	readonly config: DestinationConfig;
	/** Whether the destination is currently loaded and operational */
	readonly loaded: boolean;
	/** Last error encountered by this destination, if any */
	lastError?: Error;
	/** Timestamp when this destination was last used */
	lastUsed?: Date;
	/** Number of events processed by this destination */
	eventsProcessed: number;
	/** Number of errors encountered by this destination */
	errorCount: number;
}

/**
 * Destination manager that handles loading, processing, and lifecycle of analytics destinations.
 *
 * This class provides:
 * - Eager loading of destinations from configuration
 * - Event processing through multiple destinations with error isolation
 * - Comprehensive logging and error tracking
 * - Connection testing and health monitoring
 * - Consent-based event filtering
 *
 * @example
 * ```typescript
 * const manager = new DestinationManager(logger);
 * await manager.loadDestinations(configs);
 * await manager.processEvents(events, context);
 * ```
 */
export class DestinationManager {
	private destinations = new Map<string, DestinationInstance>();
	private factories = new Map<string, DestinationFactory>();
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		customRegistry?: Record<string, DestinationFactory>
	) {
		this.logger = logger;

		// Use provided registry or fall back to global plugins
		const sourceRegistry = customRegistry || destinationPlugins.getPlugins();

		// Validate the registry
		const validatedRegistry = validateDestinationRegistry(sourceRegistry);

		// Load validated factories
		for (const [type, factory] of Object.entries(validatedRegistry)) {
			this.factories.set(type, factory);
		}

		this.logger.info('Destination manager initialized', {
			factoryCount: this.factories.size,
			registeredTypes: Array.from(this.factories.keys()),
		});
	}

	/**
	 * Validates that all required destinations are available before loading.
	 *
	 * @param configs - Array of destination configurations to validate
	 * @throws {Error} When destinations package is not installed or destinations are missing
	 *
	 * @internal
	 */
	private async validateDestinations(
		configs: DestinationConfig[]
	): Promise<void> {
		const enabledTypes = configs
			.filter((config) => config.enabled)
			.map((config) => config.type);

		if (enabledTypes.length === 0) {
			this.logger.debug('No destinations to validate');
			return;
		}

		this.logger.debug('Validating destinations', { enabledTypes });

		const isValid = await validateDestinationsAvailable(enabledTypes);
		if (!isValid) {
			const error = new Error(
				'Some required destinations are not available. ' +
					`Please ensure @c15t/destinations package is installed and contains: ${enabledTypes.join(', ')}`
			);
			this.logger.error('Destination validation failed', {
				enabledTypes,
				error: error.message,
			});
			throw error;
		}

		this.logger.debug('Destination validation passed', { enabledTypes });
	}

	/**
	 * Load destinations from configuration with comprehensive error handling.
	 *
	 * @param configs - Array of destination configurations
	 * @throws {Error} When destination validation fails
	 *
	 * @example
	 * ```typescript
	 * const configs = [
	 *   { type: 'posthog', enabled: true, settings: { apiKey: 'phc_123' } },
	 *   { type: 'console', enabled: true, settings: {} }
	 * ];
	 * await manager.loadDestinations(configs);
	 * ```
	 */
	async loadDestinations(configs: DestinationConfig[]): Promise<void> {
		this.logger.info('Loading destinations', { count: configs.length });

		// Validate all destinations are available before attempting to load
		await this.validateDestinations(configs);

		const loadPromises = configs.map(async (config) => {
			if (!config.enabled) {
				this.logger.debug('Skipping disabled destination', {
					type: config.type,
				});
				return;
			}

			try {
				await this.loadDestination(config);
				this.logger.info('Destination loaded successfully', {
					type: config.type,
					version: this.destinations.get(config.type)?.plugin.version,
				});
			} catch (error) {
				this.logger.error('Failed to load destination', {
					type: config.type,
					error: error instanceof Error ? error.message : String(error),
				});
				// Continue loading other destinations - don't throw here
			}
		});

		await Promise.allSettled(loadPromises);

		const loadedCount = Array.from(this.destinations.values()).filter(
			(d) => d.loaded
		).length;
		this.logger.info('Destination loading completed', {
			requested: configs.filter((c) => c.enabled).length,
			loaded: loadedCount,
		});
	}

	/**
	 * Load a single destination from configuration.
	 *
	 * @param config - Destination configuration
	 * @throws {Error} When destination type is not found or initialization fails
	 *
	 * @internal
	 */
	private async loadDestination(config: DestinationConfig): Promise<void> {
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

		// Create destination plugin instance
		const plugin = await factory(config.settings);

		// Initialize the destination
		await plugin.initialize(config.settings);

		// Create destination instance
		const instance: DestinationInstance = {
			plugin,
			config,
			loaded: true,
			eventsProcessed: 0,
			errorCount: 0,
		};

		// Store the instance
		this.destinations.set(config.type, instance);

		this.logger.debug('Destination instance created', {
			type: config.type,
			version: plugin.version,
			name: plugin.name,
		});
	}

	/**
	 * Process analytics events through all loaded destinations with error isolation.
	 *
	 * @param events - Array of analytics events to process
	 * @param context - Event context containing session, user, and consent data
	 *
	 * @example
	 * ```typescript
	 * const context = {
	 *   sessionId: 'session-123',
	 *   sessionStart: new Date(),
	 *   consent: { necessary: true, measurement: true, marketing: false, functionality: false, experience: false },
	 *   userId: 'user-123'
	 * };
	 * await manager.processEvents(events, context);
	 * ```
	 */
	async processEvents(
		events: AnalyticsEvent[],
		context: EventContext
	): Promise<void> {
		if (events.length === 0) {
			this.logger.debug('No events to process');
			return;
		}

		this.logger.debug('Processing events', {
			eventCount: events.length,
			destinationCount: this.destinations.size,
		});

		const promises: Promise<void>[] = [];

		for (const [type, instance] of this.destinations) {
			if (!instance.loaded) {
				this.logger.debug('Skipping unloaded destination', { type });
				continue;
			}

			// Filter events by consent requirements
			const filteredEvents = this.filterEventsByConsent(
				events,
				instance.config.requiredConsent,
				context.consent
			);

			if (filteredEvents.length === 0) {
				this.logger.debug('No events match consent requirements', { type });
				continue;
			}

			// Process events for this destination
			promises.push(
				this.processEventsForDestination(instance, filteredEvents, context)
			);
		}

		// Wait for all destinations to complete (with error isolation)
		const results = await Promise.allSettled(promises);

		// Log any failures
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				const destinationTypes = Array.from(this.destinations.keys());
				this.logger.error('Destination processing failed', {
					type: destinationTypes[index],
					error:
						result.reason instanceof Error
							? result.reason.message
							: String(result.reason),
				});
			}
		});

		this.logger.debug('Event processing completed', {
			processedDestinations: results.length,
			successful: results.filter((r) => r.status === 'fulfilled').length,
			failed: results.filter((r) => r.status === 'rejected').length,
		});
	}

	/**
	 * Process events for a specific destination with comprehensive error handling.
	 *
	 * @param instance - Destination instance to process events for
	 * @param events - Events to process
	 * @param context - Event context
	 *
	 * @internal
	 */
	private async processEventsForDestination(
		instance: DestinationInstance,
		events: AnalyticsEvent[],
		context: EventContext
	): Promise<void> {
		const { config } = instance;

		try {
			this.logger.debug('Processing events for destination', {
				type: config.type,
				eventCount: events.length,
			});

			for (const event of events) {
				await this.processEventForDestination(instance, event, context);
				instance.eventsProcessed++;
				instance.lastUsed = new Date();
			}

			this.logger.debug('Destination processing completed', {
				type: config.type,
				eventsProcessed: events.length,
			});
		} catch (error) {
			instance.errorCount++;
			instance.lastError =
				error instanceof Error ? error : new Error(String(error));

			this.logger.error('Destination processing failed', {
				type: config.type,
				error: error instanceof Error ? error.message : String(error),
				errorCount: instance.errorCount,
			});

			// Re-throw to be caught by Promise.allSettled
			throw error;
		}
	}

	/**
	 * Process a single event for a destination using the appropriate handler.
	 *
	 * @param instance - Destination instance
	 * @param event - Event to process
	 * @param context - Event context
	 *
	 * @internal
	 */
	private async processEventForDestination(
		instance: DestinationInstance,
		event: AnalyticsEvent,
		context: EventContext
	): Promise<void> {
		const { plugin } = instance;

		try {
			// Call before hook if available
			const processedEvent =
				(await plugin.onBeforeEvent?.(event as SpecificAnalyticsEvent)) ??
				event;

			// Route to appropriate handler based on event type
			switch (event.type) {
				case 'track':
					await plugin.track?.(processedEvent as AnalyticsTrackEvent, context);
					break;
				case 'page':
					await plugin.page?.(processedEvent as AnalyticsPageEvent, context);
					break;
				case 'identify':
					await plugin.identify?.(
						processedEvent as AnalyticsIdentifyEvent,
						context
					);
					break;
				case 'group':
					await plugin.group?.(processedEvent as AnalyticsGroupEvent, context);
					break;
				case 'alias':
					await plugin.alias?.(processedEvent as AnalyticsAliasEvent, context);
					break;
				case 'consent':
					await plugin.consent?.(
						processedEvent as AnalyticsConsentEvent,
						context
					);
					break;
				default:
					this.logger.warn('Unknown event type', {
						type: instance.config.type,
						eventType: event.type,
					});
			}

			// Call after hook if available
			await plugin.onAfterEvent?.(processedEvent as SpecificAnalyticsEvent, {
				success: true,
				destination: instance.config.type,
				timestamp: new Date(),
			});
		} catch (error) {
			this.logger.error('Event processing failed', {
				type: instance.config.type,
				eventType: event.type,
				error: error instanceof Error ? error.message : String(error),
			});

			// Call error hook if available
			await plugin.onError?.(
				error instanceof Error ? error : new Error(String(error)),
				event as SpecificAnalyticsEvent
			);

			throw error;
		}
	}

	/**
	 * Filter events by consent requirements.
	 *
	 * @param events - Events to filter
	 * @param requiredConsent - Required consent purposes for the destination
	 * @param userConsent - Current user consent state
	 * @returns Filtered events that match consent requirements
	 *
	 * @internal
	 */
	private filterEventsByConsent(
		events: AnalyticsEvent[],
		requiredConsent: ReadonlyArray<ConsentPurpose> | undefined,
		userConsent: AnalyticsConsent
	): AnalyticsEvent[] {
		if (!requiredConsent || requiredConsent.length === 0) {
			// No consent requirements - all events pass through
			return events;
		}

		return events.filter((event) => {
			// Consent events always go through
			if (event.type === 'consent') return true;

			// Check if user has all required consent purposes
			return requiredConsent.every((purpose) => userConsent[purpose]);
		});
	}

	/**
	 * Test connection for a specific destination.
	 *
	 * @param type - Destination type to test
	 * @returns True if connection is successful, false otherwise
	 *
	 * @example
	 * ```typescript
	 * const isConnected = await manager.testDestination('posthog');
	 * if (isConnected) {
	 *   console.log('PostHog is connected');
	 * }
	 * ```
	 */
	async testDestination(type: string): Promise<boolean> {
		const instance = this.destinations.get(type);
		if (!instance) {
			this.logger.warn('Destination not found for testing', { type });
			return false;
		}

		try {
			const isConnected = await instance.plugin.testConnection();
			this.logger.debug('Destination connection test completed', {
				type,
				connected: isConnected,
			});
			return isConnected;
		} catch (error) {
			this.logger.error('Destination connection test failed', {
				type,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Test connections for all loaded destinations.
	 *
	 * @returns Array of connection test results with detailed status information
	 *
	 * @example
	 * ```typescript
	 * const results = await manager.testConnections();
	 * results.forEach(result => {
	 *   console.log(`${result.type}: ${result.status}`);
	 * });
	 * ```
	 */
	async testConnections(): Promise<
		Array<{
			type: string;
			status: 'connected' | 'disconnected' | 'error';
			error?: string;
		}>
	> {
		this.logger.debug('Testing connections for all destinations');

		const results: Array<{
			type: string;
			status: 'connected' | 'disconnected' | 'error';
			error?: string;
		}> = [];

		for (const [type, instance] of this.destinations) {
			try {
				const isConnected = await instance.plugin.testConnection();
				results.push({
					type,
					status: isConnected ? 'connected' : 'disconnected',
				});
			} catch (error: unknown) {
				results.push({
					type,
					status: 'error',
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		this.logger.debug('Connection tests completed', {
			total: results.length,
			connected: results.filter((r) => r.status === 'connected').length,
			disconnected: results.filter((r) => r.status === 'disconnected').length,
			errors: results.filter((r) => r.status === 'error').length,
		});

		return results;
	}

	/**
	 * Get destination status and health information.
	 *
	 * @param type - Destination type identifier
	 * @returns Destination instance or undefined if not found
	 *
	 * @example
	 * ```typescript
	 * const status = manager.getDestinationStatus('posthog');
	 * if (status) {
	 *   console.log(`Events processed: ${status.eventsProcessed}`);
	 *   console.log(`Errors: ${status.errorCount}`);
	 * }
	 * ```
	 */
	getDestinationStatus(type: string): DestinationInstance | undefined {
		return this.destinations.get(type);
	}

	/**
	 * Get all loaded destination instances.
	 *
	 * @returns Array of loaded destination instances
	 */
	getLoadedDestinations(): DestinationInstance[] {
		return Array.from(this.destinations.values()).filter((d) => d.loaded);
	}

	/**
	 * Get all loaded destination types.
	 *
	 * @returns Array of loaded destination type identifiers
	 */
	getLoadedDestinationTypes(): string[] {
		return Array.from(this.destinations.keys()).filter(
			(type) => this.destinations.get(type)?.loaded
		);
	}

	/**
	 * Get destination health summary.
	 *
	 * @returns Summary of destination health and statistics
	 */
	getHealthSummary(): {
		totalDestinations: number;
		loadedDestinations: number;
		totalEventsProcessed: number;
		totalErrors: number;
		destinationsWithErrors: number;
	} {
		const instances = Array.from(this.destinations.values());
		const loadedInstances = instances.filter((d) => d.loaded);

		return {
			totalDestinations: instances.length,
			loadedDestinations: loadedInstances.length,
			totalEventsProcessed: loadedInstances.reduce(
				(sum, d) => sum + d.eventsProcessed,
				0
			),
			totalErrors: loadedInstances.reduce((sum, d) => sum + d.errorCount, 0),
			destinationsWithErrors: loadedInstances.filter((d) => d.errorCount > 0)
				.length,
		};
	}

	/**
	 * Clear all loaded destinations and reset state.
	 *
	 * @warning This will remove all loaded destinations and their state
	 */
	clear(): void {
		this.logger.info('Clearing all destinations');
		this.destinations.clear();
		this.logger.info('All destinations cleared');
	}
}
