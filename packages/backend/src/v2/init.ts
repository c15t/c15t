import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import type { C15TContext, C15TOptions } from '~/v2/types';
import { version as packageVersion } from '../version';
import { createRegistry } from './db/registry';
import { DB } from './db/schema';
import { DestinationManager } from './handlers/analytics/destination-manager';
import { EventProcessor } from './handlers/analytics/event-processor';
import { processAnalyticsEvents } from './handlers/analytics/process.handler';
import { createTelemetryOptions } from './utils/create-telemetry-options';
import { initLogger } from './utils/logger';

// SDK instance should be at module level for proper lifecycle management
let telemetrySdk: NodeSDK | undefined;

/**
 * Initializes telemetry SDK with the provided configuration
 *
 * @param appName - The application name for telemetry service identification
 * @param telemetryOptions - Telemetry configuration options
 * @param logger - Logger instance for telemetry status reporting
 * @returns Whether telemetry was successfully initialized
 */
const initializeTelemetry = (
	appName: string,
	telemetryOptions: ReturnType<typeof createTelemetryOptions>,
	logger: ReturnType<typeof initLogger>
): boolean => {
	// Skip if SDK already initialized or telemetry is disabled
	if (telemetrySdk) {
		logger.debug('Telemetry SDK already initialized, skipping');
		return true;
	}

	if (telemetryOptions?.disabled) {
		logger.info('Telemetry is disabled by configuration');
		return false;
	}

	try {
		// Create a telemetry resource with provided values or safe defaults
		const resource = resourceFromAttributes({
			'service.name': appName,
			'service.version': packageVersion,
			...(telemetryOptions?.defaultAttributes || {}),
		});

		logger.debug('Initializing telemetry with resource attributes', {
			attributes: resource.attributes,
		});

		// Use provided tracer or fallback to console exporter
		const traceExporter = telemetryOptions?.tracer
			? undefined // SDK will use the provided tracer
			: new ConsoleSpanExporter();

		// Create and start the SDK
		telemetrySdk = new NodeSDK({
			resource,
			traceExporter,
		});

		telemetrySdk.start();
		logger.info('Telemetry successfully initialized');
		return true;
	} catch (error) {
		// Log the error but don't crash the application
		logger.error('Telemetry initialization failed', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		logger.warn('Continuing without telemetry');
		return false;
	}
};

export const init = (options: C15TOptions): C15TContext => {
	const appName = options.appName || 'c15t';

	const logger = initLogger({
		...options.logger,
		appName: String(appName),
	});

	// Create telemetry options
	const telemetryOptions = createTelemetryOptions(
		String(appName),
		options.advanced?.telemetry
	);

	// Initialize telemetry
	const telemetryInitialized = initializeTelemetry(
		String(appName),
		telemetryOptions,
		logger
	);

	// Log final telemetry status
	if (telemetryOptions?.disabled) {
		logger.info('Telemetry is disabled by configuration');
	} else if (telemetryInitialized) {
		logger.info('Telemetry initialized successfully');
	} else {
		logger.warn(
			'Telemetry initialization failed, continuing without telemetry'
		);
	}

	// Initialize core components
	const client = DB.client(options.adapter);

	const orm = client.orm('1.0.0');

	// Initialize destination manager if analytics destinations are configured
	let destinationManager: DestinationManager | undefined;
	if (options.analytics?.destinations) {
		// Pass custom registry if provided, otherwise use dynamic loading
		const registry = options.analytics.customRegistry;
		destinationManager = new DestinationManager(logger, registry);

		// Load destinations asynchronously - they'll be available when needed
		destinationManager
			.loadDestinations(options.analytics.destinations)
			.catch((error) => {
				logger.error('Failed to load analytics destinations:', error);
			});
	}

	const context: C15TContext = {
		...options,
		appName,
		logger,
		db: orm,
		registry: createRegistry({
			db: orm,
			ctx: {
				logger,
			},
		}),
		destinationManager,
	};

	return context;
};

// ============================================================================
// c15tInstance Factory Function
// ============================================================================

/**
 * Custom error types for initialization
 */
export class C15TInitializationError extends Error {
	constructor(
		message: string,
		public component?: string
	) {
		super(message);
		this.name = 'C15TInitializationError';
	}
}

export class ConfigurationError extends C15TInitializationError {
	constructor(
		message: string,
		public field?: string
	) {
		super(message, 'configuration');
		this.name = 'ConfigurationError';
	}
}

/**
 * Enhanced context returned by c15tInstance factory
 */
export interface C15TInstanceContext extends C15TContext {
	// Core analytics components
	eventProcessor: EventProcessor;

	// HTTP handlers
	handlers: {
		processEvents: typeof processAnalyticsEvents;
	};

	// Utilities
	utils: {
		getDestinationStatus: (type: string) => any;
		testDestination: (type: string) => Promise<boolean>;
		getLoadedDestinations: () => any[];
	};
}

/**
 * Options validation function
 */
function validateAnalyticsOptions(options: C15TOptions): void {
	if (!options.analytics) {
		return;
	}

	const { destinations = [] } = options.analytics;

	// Validate destinations
	for (const dest of destinations) {
		if (!dest.type) {
			throw new ConfigurationError('Destination type is required');
		}
		if (!dest.settings) {
			throw new ConfigurationError('Destination settings are required');
		}
	}
}

/**
 * Error handling for initialization failures
 */
function handleInitializationError(error: Error, component: string): never {
	if (error instanceof ConfigurationError) {
		throw error;
	}

	throw new C15TInitializationError(
		`Failed to initialize ${component}: ${error.message}`,
		component
	);
}

/**
 * Main factory function for creating analytics instances
 *
 * This is the primary entry point that developers use to initialize the analytics system.
 * It integrates all core components (EventProcessor, DestinationManager, etc.) and
 * returns a context object with handlers and utilities.
 *
 * @param options - Configuration options for the analytics instance
 * @returns Promise resolving to the analytics context
 *
 * @throws {ConfigurationError} When configuration is invalid
 * @throws {C15TInitializationError} When component initialization fails
 *
 * @example
 * ```typescript
 * // Basic usage
 * const instance = await c15tInstance({
 *   analytics: {
 *     destinations: [
 *       { type: 'posthog', enabled: true, settings: { apiKey: 'phc_xxx' } },
 *       { type: 'console', enabled: true, settings: { logLevel: 'debug' } },
 *     ],
 *   },
 * });
 *
 * // Using the handlers
 * app.post('/analytics/process', instance.handlers.processEvents);
 *
 * // Using utilities
 * const status = instance.utils.getDestinationStatus('posthog');
 * const isConnected = await instance.utils.testDestination('posthog');
 * ```
 */
export async function c15tInstance(
	options: C15TOptions
): Promise<C15TInstanceContext> {
	const appName = options.appName || 'c15t';
	const logger = initLogger({
		...options.logger,
		appName: String(appName),
	});

	try {
		logger.info('Initializing c15t analytics instance', {
			appName,
			hasAnalytics: !!options.analytics,
			destinationCount: options.analytics?.destinations?.length || 0,
		});

		// Validate options
		validateAnalyticsOptions(options);

		// Initialize core components
		const eventProcessor = new EventProcessor(logger);
		const destinationManager = new DestinationManager(
			logger,
			options.analytics?.customRegistry
		);

		// Load destinations if analytics is configured
		if (options.analytics?.destinations) {
			const destinations = options.analytics.destinations;

			if (destinations.length > 0) {
				logger.info('Loading destinations', { count: destinations.length });
				await destinationManager.loadDestinations(destinations);
			}
		}

		// Create base context using existing init function
		const baseContext = init(options);

		// Create enhanced context
		const context: C15TInstanceContext = {
			...baseContext,
			eventProcessor,
			handlers: {
				processEvents: processAnalyticsEvents,
			},
			utils: {
				getDestinationStatus: (type: string) =>
					destinationManager.getDestinationStatus(type),
				testDestination: (type: string) =>
					destinationManager.testDestination(type),
				getLoadedDestinations: () => destinationManager.getLoadedDestinations(),
			},
		};

		logger.info('c15t analytics instance initialized successfully', {
			loadedDestinations: context.utils.getLoadedDestinations().length,
		});

		return context;
	} catch (error) {
		logger.error('Failed to initialize c15t analytics instance', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		handleInitializationError(
			error instanceof Error ? error : new Error(String(error)),
			'analytics-instance'
		);
	}
}
