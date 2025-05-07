import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { defu } from 'defu';
import type { DatabaseHook } from '~/pkgs/data-model';
import { getAdapter } from '~/pkgs/db-adapters';
import type { RegistryContext } from '~/pkgs/types';
import { getBaseURL } from '~/pkgs/utils';
import type { C15TContext, C15TOptions, C15TPlugin } from '~/types';
import { generateId } from './pkgs/data-model/fields/id-generator';
import type { EntityName } from './pkgs/data-model/schema/types';
import {
	ERROR_CODES,
	type SDKResult,
	type TelemetryConfig,
	createTelemetryOptions,
	fail,
	failAsync,
	ok,
	promiseToResult,
} from './pkgs/results';

import type { DoubleTieOptions } from './pkgs/types/options';
import { getLogger, initLogger } from './pkgs/utils/logger';
import { createRegistry } from './schema/create-registry';
import { getConsentTables } from './schema/definition';

/**
 * c15t Initialization Module
 *
 * This module handles the initialization of the c15t consent management system.
 * It sets up the consent context, configures storage adapters, initializes plugins,
 * and establishes security settings like secrets and trusted origins.
 *
 * The initialization process includes:
 * - Setting up storage adapters for consent data
 * - Configuring security credentials and trusted origins
 * - Initializing core and custom plugins
 * - Creating the consent context object that serves as the foundation for the system
 *
 * This is an internal module typically not used directly by consumers of the c15t library.
 */

// SDK instance should be at module level for proper lifecycle management
let telemetrySdk: NodeSDK | undefined;

/**
 * Initializes the c15t consent management system using Result pattern
 *
 * This function creates and configures the consent context based on the provided options.
 * It sets up storage adapters, initializes plugins, configures security settings,
 * and establishes the foundation for the consent management system.
 *
 * This version uses the neverthrow Result pattern for error handling.
 *
 * @template P - The plugin types used in the configuration
 * @param options - Configuration options for the c15t instance
 * @returns A Promise resolving to a Result containing the initialized consent context
 *
 * @example
 * ```typescript
 * const contextResult = await init({
 *   storage: memoryAdapter(),
 *   plugins: [geoPlugin()]
 * });
 *
 * // Handle success and error cases explicitly
 * contextResult.match(
 *   (context) => {
 *     // Use the successfully initialized context
 *   },
 *   (error) => {
 *     // Handle the initialization error
 *     console.error('Failed to initialize:', error.message);
 *   }
 * );
 * ```
 */
export const init = async <P extends C15TPlugin[]>(
	options: C15TOptions<P>
): Promise<SDKResult<C15TContext>> => {
	try {
		// Type-safe handling of options with explicit type assertions
		const loggerOptions = options.logger;
		const baseUrlStr = options.baseURL;
		const basePathStr = options.basePath as string | undefined;
		const databaseHooks = (options.databaseHooks || []) as DatabaseHook[];
		const appName = options.appName || 'c15t';

		// Create a single logger instance early in the initialization process
		// Initialize the global logger for use throughout the application
		const logger = initLogger({
			...loggerOptions,
			appName: String(appName),
		});

		// Create telemetry options
		const telemetryOptions = createTelemetryOptions(
			String(appName),
			options.telemetry as TelemetryConfig
		);

		// Initialize telemetry directly here instead of using a separate function
		let telemetryInitialized = false;
		try {
			// Skip if SDK already initialized or telemetry is disabled
			if (telemetrySdk) {
				logger.debug('Telemetry SDK already initialized, skipping');
				telemetryInitialized = true;
			} else if (telemetryOptions?.disabled) {
				logger.info('Telemetry is disabled by configuration');
				telemetryInitialized = false;
			} else {
				// Create a telemetry resource with provided values or safe defaults
				const resource = new Resource({
					'service.name': String(appName),
					'service.version': String(process.env.npm_package_version || '1.0.0'),
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
				telemetryInitialized = true;
			}
		} catch (error) {
			// Log the error but don't crash the application
			logger.error('Telemetry initialization failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			logger.warn('Continuing without telemetry');
			telemetryInitialized = false;
		}

		// Log telemetry initialization status
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
		logger.info('Initializing adapter', {
			storage:
				options.storage && typeof options.storage === 'object'
					? ((options.storage as Record<string, unknown>).type as string) ||
						'unknown'
					: 'unknown',
			clientVersion: options.clientVersion || 'not provided',
			appName,
			baseURL: baseUrlStr,
		});

		const adapterResult = await promiseToResult(
			getAdapter(options),
			ERROR_CODES.INITIALIZATION_FAILED
		);

		// After getting adapter
		logger.debug('Adapter initialization result', {
			success: adapterResult.isOk(),
		});

		return adapterResult.andThen((adapter) => {
			const resolvedBaseURL = getBaseURL(baseUrlStr, basePathStr);

			// Create normalized options directly with h3 patterns but no version field
			const finalOptions: DoubleTieOptions = {
				...options,
				baseURL: resolvedBaseURL ? new URL(resolvedBaseURL).origin : '',
				basePath: basePathStr || '/api/c15t',
				plugins: [...(options.plugins || []), ...getInternalPlugins(options)],
				telemetry: telemetryOptions,
			};

			// Create ID generator
			const generateIdFunc = ({
				model,
				size = 16,
			}: { model: EntityName; size?: number }) => {
				return (
					finalOptions?.advanced?.generateId?.({ model, size }) ||
					generateId(getConsentTables(finalOptions)[model].entityPrefix)
				);
			};

			// Create registry context
			const registryContext: RegistryContext = {
				adapter,
				options: finalOptions,
				logger,
				hooks: databaseHooks,
				generateId: generateIdFunc,
			};

			// Create full application context
			const ctx: C15TContext = {
				appName: String(appName),
				options: finalOptions,
				trustedOrigins: options.trustedOrigins || [],
				baseURL: resolvedBaseURL || '',
				logger,
				generateId: generateIdFunc,
				adapter,
				registry: createRegistry(registryContext),
				tables: getConsentTables(options),
			};

			// Initialize plugins and return
			return runPluginInit(ctx);
		});
	} catch (error) {
		// Use getLogger here since we might be in an error case before logger initialization
		const errorLogger = getLogger(options.logger);
		errorLogger.error('Initialization failed', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return failAsync(
			`Failed to initialize consent system: ${error instanceof Error ? error.message : String(error)}`,
			{
				code: ERROR_CODES.INITIALIZATION_FAILED,
				meta: { error },
			}
		);
	}
};

/**
 * Initializes all registered plugins using the Result pattern
 *
 * This function runs the init method of each plugin in sequence,
 * collecting any context or options modifications they provide.
 *
 * @param ctx - The current consent context
 * @returns A Result with the updated context after plugin initialization
 */
function runPluginInit(ctx: C15TContext): SDKResult<C15TContext> {
	try {
		let options = ctx.options as unknown as C15TOptions<C15TPlugin[]>;
		const plugins = options.plugins || [];
		let context: C15TContext = ctx;

		for (const plugin of plugins) {
			// Type assertion for plugin to C15TPlugin
			const typedPlugin = plugin as C15TPlugin;
			if (typedPlugin.init) {
				const result = typedPlugin.init(ctx);
				if (typeof result === 'object') {
					if (result.options) {
						options = defu(result.options, options) as C15TOptions<
							C15TPlugin[]
						>;
					}
					if (result.context) {
						context = {
							...context,
							...(result.context as Partial<C15TContext>),
						};
					}
				}
			}
		}

		context.options = options as unknown as DoubleTieOptions;
		return ok(context);
	} catch (error) {
		return fail(
			`Plugin initialization failed: ${error instanceof Error ? error.message : String(error)}`,
			{
				code: ERROR_CODES.PLUGIN_INITIALIZATION_FAILED,
				meta: { error },
			}
		);
	}
}

/**
 * Retrieves internal plugins based on configuration options
 *
 * This function determines which internal plugins should be automatically
 * included based on the provided options.
 *
 * @param options - The c15t configuration options
 * @returns An array of internal plugins to include
 */
function getInternalPlugins(_options: C15TOptions): C15TPlugin[] {
	const plugins: C15TPlugin[] = [];

	return plugins;
}
