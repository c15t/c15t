import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import type { C15TContext, C15TOptions } from '~/v2/types';
import { version as packageVersion } from '../version';
import { createTelemetryOptions } from './pkgs/results';
import { initLogger } from './pkgs/utils/logger';
import { createRegistry } from './registry';
import { DB } from './schema';

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
		const resource = new Resource({
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
	const client = DB.client(options.database);

	const orm = client.orm('1.0.0');

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
	};

	return context;
};
