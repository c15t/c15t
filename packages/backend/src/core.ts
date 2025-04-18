import type { C15TContext, C15TOptions, C15TPlugin } from '~/types';
import { init } from './init';
import { createApiHandler } from './pkgs/api-router';
import {
	ERROR_CODES,
	type SDKResult,
	type SDKResultAsync,
	failAsync,
	okAsync,
} from './pkgs/results';
import { routes } from './routes';
import type { Route } from './routes/types';

/**
 * Interface representing a configured c15t consent management instance.
 *
 * @typeParam PluginTypes - Array of plugin types used in this instance
 *
 * @remarks
 * The C15TInstance provides the main interface for interacting with the consent
 * management system. It includes methods for handling requests, accessing API
 * endpoints, and managing the system's configuration.
 *
 * All asynchronous operations return {@link SDKResultAsync} types for
 * consistent error handling across the system.
 *
 * @example
 * ```typescript
 * const instance: C15TInstance = c15tInstance({
 *   secret: 'your-secret',
 *   storage: memoryAdapter()
 * });
 *
 * // Handle an incoming request
 * const response = await instance.handler(request);
 * ```
 */
export interface C15TInstance<PluginTypes extends C15TPlugin[] = C15TPlugin[]> {
	/**
	 * Processes incoming HTTP requests and routes them to appropriate handlers.
	 *
	 * @param request - The incoming web request
	 * @returns A Promise resolving to a Result containing the HTTP response
	 *
	 * @throws Never - All errors are captured in the Result type
	 *
	 * @example
	 * ```typescript
	 * const result = await instance.handler(request);
	 * result.match(
	 *   response => sendResponse(response),
	 *   error => handleError(error)
	 * );
	 * ```
	 */
	handler: (request: Request) => Promise<SDKResultAsync<Response>>;

	/**
	 * Retrieves available API endpoints and their configurations.
	 *
	 * @returns A Promise resolving to a Result containing the available API endpoints
	 *
	 * @throws Never - All errors are captured in the Result type
	 *
	 * @example
	 * ```typescript
	 * const endpoints = await instance.getApi();
	 * endpoints.map(
	 *   apis => console.log('Available endpoints:', apis),
	 *   error => console.error('Failed to get endpoints:', error)
	 * );
	 * ```
	 */
	getApi: () => Promise<SDKResultAsync<Route[]>>;

	/**
	 * The configuration options used for this instance.
	 */
	options: C15TOptions<PluginTypes>;

	/**
	 * Access to the underlying context as a Result type.
	 *
	 * @remarks
	 * The context is wrapped in a Result type to ensure error handling
	 * consistency. Access should be handled using Result pattern methods.
	 */
	$context: Promise<SDKResult<C15TContext>>;
}

/**
 * Creates a new c15t consent management instance.
 *
 * @typeParam PluginTypes - Array of plugin types to be used in this instance
 * @typeParam ConfigOptions - Configuration options extending the base C15TOptions
 *
 * @param options - Configuration options for the consent management system
 * @returns A configured C15TInstance ready for use
 *
 * @remarks
 * This is the main factory function for creating c15t instances. It initializes
 * the consent management system with the provided configuration and sets up all
 * necessary components including:
 *
 * - Database adapters
 * - Plugin system
 * - Request handlers
 * - API endpoints
 * - CORS configuration
 *
 * All async operations use the Result pattern for error handling, ensuring
 * that errors are handled consistently throughout the system.
 *
 * @example
 * Basic initialization:
 * ```typescript
 * import { c15tInstance } from '@c15t/backend';
 *
 * const manager = c15tInstance({
 *   storage: memoryAdapter()
 * });
 * ```
 *
 * @example
 * Advanced initialization with type parameters:
 * ```typescript
 * type MyPlugins = [typeof geoPlugin, typeof analyticsPlugin];
 *
 * const c15t = c15tInstance<MyPlugins>({
 *   storage: kyselyAdapter(db),
 *   plugins: [geoPlugin(), analyticsPlugin()]
 * });
 * ```
 */
export const c15tInstance = <PluginTypes extends C15TPlugin[] = C15TPlugin[]>(
	options: C15TOptions<PluginTypes>
): C15TInstance<PluginTypes> => {
	// Initialize context directly without retry
	const contextPromise = init(options);
	let webHandler: ((request: Request) => Promise<Response>) | null = null;

	/**
	 * Creates or returns the cached H3 app handler
	 */
	const getHandler = async (
		ctx: C15TContext
	): Promise<(request: Request) => Promise<Response>> => {
		// Initialize the app once and cache it
		if (!webHandler) {
			// Use createApiHandler instead of direct H3 app creation
			// This ensures the registry and other context items are properly passed to event handlers
			const { handler } = createApiHandler({
				options: ctx.options,
				context: {
					adapter: ctx.adapter,
					registry: ctx.registry,
					trustedOrigins: ctx.trustedOrigins,
					logger: ctx.logger,
				},
			});

			// Cache the handler
			webHandler = handler;
		}

		return webHandler;
	};

	/**
	 * Handles incoming requests using H3
	 */
	const handler = async (
		request: Request
	): Promise<SDKResultAsync<Response>> => {
		try {
			const contextResult = await contextPromise;

			return contextResult.match(
				// Success case
				async (ctx) => {
					try {
						// Get the web handler which accepts standard Request objects
						const handler = await getHandler(ctx);

						// Simply call the handler with the request
						const response = await handler(request);
						return okAsync(response);
					} catch (error) {
						return failAsync('Request handling failed', {
							code: ERROR_CODES.REQUEST_HANDLER_ERROR,
							cause: error instanceof Error ? error : undefined,
						});
					}
				},
				// Error case
				(error) => {
					// Handle initialization errors without special version handling
					return failAsync(`Context initialization failed: ${error.message}`, {
						code: ERROR_CODES.INITIALIZATION_FAILED,
						cause: error,
					});
				}
			);
		} catch (error) {
			return failAsync(
				`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
				{
					code: ERROR_CODES.UNKNOWN_ERROR,
					cause: error instanceof Error ? error : undefined,
				}
			);
		}
	};

	// Return the instance
	return {
		handler,
		getApi: async (): Promise<SDKResultAsync<Route[]>> => {
			const contextResult = await contextPromise;

			return contextResult.match(
				// Success case - just return the routes
				() => okAsync(routes),
				// Error case
				(error) =>
					failAsync(`API retrieval failed: ${error.message}`, {
						code: ERROR_CODES.API_RETRIEVAL_ERROR,
						cause: error,
					})
			);
		},
		options,
		$context: contextPromise,
	};
};
