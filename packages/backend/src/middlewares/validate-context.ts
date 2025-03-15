import { createAuthMiddleware } from '~/pkgs/api-router';
import { Adapter } from '~/pkgs/db-adapters';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/errors';
import type { C15TContext, C15TPlugin } from '~/pkgs/types';

/**
 * Redacts sensitive information from context for error reporting
 *
 * @param context - The context object to redact
 * @returns A sanitized version of the context
 */
function redactContext(context: unknown): Record<string, unknown> {
	if (!context || typeof context !== 'object') {
		return { type: typeof context };
	}

	const typedContext = context as C15TContext;
	return {
		baseURL: typedContext.baseURL,
		storageType: typedContext.storage?.constructor.name,
		pluginsCount: Array.isArray(typedContext.plugins)
			? typedContext.plugins.length
			: 0,
		hasOptions: !!typedContext.options,
		hasLogger: !!typedContext.logger,
		hasPlugins: !!typedContext.plugins,
	};
}

/**
 * Validates plugin initialization status
 *
 * @param plugins - Array of configured plugins
 * @param initializedPlugins - Array of successfully initialized plugins
 * @returns Array of failed plugin names, or null if all plugins initialized
 */
function validatePlugins(
	plugins: C15TPlugin[] | undefined,
	initializedPlugins: C15TPlugin[] | undefined
): string[] | null {
	if (!plugins?.length) {
		return null;
	}

	const initializedNames = new Set(initializedPlugins?.map((p) => p.id) ?? []);

	const failedPlugins = plugins
		.filter((p) => !initializedNames.has(p.id))
		.map((p) => p.id);

	return failedPlugins.length > 0 ? failedPlugins : null;
}

/**
 * Middleware that validates the context for all routes
 *
 * This middleware ensures that the context object is properly structured and
 * contains all required properties and services before allowing the request to proceed.
 *
 * @remarks
 * The middleware performs comprehensive validation of:
 * - Basic context structure
 * - Required configuration options
 * - Storage adapter availability
 * - Logger availability
 * - Plugin initialization status
 * - Required services and dependencies
 *
 * @throws {DoubleTieError} Throws appropriate errors for:
 * - INVALID_CONFIGURATION: When context or options are invalid
 * - STORAGE_ERROR: When storage adapter is not available
 * - INITIALIZATION_FAILED: When required services failed to initialize
 *
 * @example
 * ```typescript
 * // Using with memory adapter
 * const router = createRouter(endpoints, {
 *   routerMiddleware: [
 *     {
 *       path: '/**',
 *       middleware: validateContextMiddleware
 *     }
 *   ]
 * });
 * ```
 */
export const validateContextMiddleware = createAuthMiddleware(async (ctx) => {
	const { context } = ctx;

	// Basic context validation
	if (!context || typeof context !== 'object') {
		throw new DoubleTieError(
			'The context configuration is incomplete. Please ensure all required configuration options are provided and properly formatted.',
			{
				code: ERROR_CODES.INVALID_CONFIGURATION,
				status: 500,
				data: redactContext(context),
			}
		);
	}

	// Ensure the context is properly typed
	const typedContext = context as C15TContext;

	// Validate required configuration
	if (!typedContext.options) {
		throw new DoubleTieError(
			'The context configuration is missing required options. Please ensure the options object is properly configured.',
			{
				code: ERROR_CODES.INVALID_CONFIGURATION,
				status: 500,
			}
		);
	}

	// Optional storage adapter validation
	if (typedContext.storage) {
		const storage = typedContext.storage as Adapter;
		const requiredMethods = ['subjects', 'records', 'policies'];
		const missingMethods = requiredMethods.filter(
			(method) => !(method in storage)
		);

		if (missingMethods.length > 0) {
			typedContext.logger?.warn?.('Storage adapter missing methods', {
				missingMethods,
				storageType: storage.constructor.name,
			});
		}
	}

	// Validate logger (make it optional for memory adapter in development)
	if (!typedContext.logger && process.env.NODE_ENV === 'production') {
		throw new DoubleTieError(
			'Logger is required in production environment. Please configure a logger for your application.',
			{
				code: ERROR_CODES.INVALID_CONFIGURATION,
				status: 500,
				data: {
					environment: process.env.NODE_ENV,
				},
			}
		);
	}

	// Validate plugins if any are configured
	const failedPlugins = validatePlugins(
		typedContext.options.plugins,
		typedContext.plugins as C15TPlugin[] | undefined
	);
	if (failedPlugins) {
		throw new DoubleTieError(
			'Plugin initialization failed. Some plugins could not be initialized properly. Please check your plugin configuration.',
			{
				code: ERROR_CODES.PLUGIN_INITIALIZATION_FAILED,
				status: 500,
				data: {
					failedPlugins,
				},
			}
		);
	}

	// Log successful validation if logger exists
	typedContext.logger?.debug?.('Context validation successful', {
		baseURL: typedContext.baseURL,
		storageType: typedContext.storage?.constructor.name,
		pluginsCount: Array.isArray(typedContext.plugins)
			? typedContext.plugins.length
			: 0,
	});

	return { context: typedContext };
});
