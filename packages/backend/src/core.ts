import {
	BASE_ERROR_CODES,
	type C15TResult,
	type C15TResultAsync,
	failAsync,
	okAsync,
	safeResultAsync,
} from './pkgs/errors';
import { router } from './router';

import type {
	C15TContext,
	C15TOptions,
	C15TPlugin,
	FilterActions,
} from '~/pkgs/types';
import { getBaseURL } from '~/pkgs/utils';
import { init } from './init';

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
 * All asynchronous operations return {@link C15TResultAsync} types for
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
	handler: (request: Request) => Promise<C15TResultAsync<Response>>;

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
	getApi: () => Promise<
		C15TResultAsync<FilterActions<ReturnType<typeof router>['endpoints']>>
	>;

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
	$context: Promise<C15TResult<C15TContext>>;
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
 *   secret: process.env.SECRET_KEY,
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
 *   secret: process.env.SECRET_KEY,
 *   storage: kyselyAdapter(db),
 *   plugins: [geoPlugin(), analyticsPlugin()]
 * });
 * ```
 */
export const c15tInstance = <
	PluginTypes extends C15TPlugin[] = C15TPlugin[],
	ConfigOptions extends C15TOptions<PluginTypes> = C15TOptions<PluginTypes>,
>(
	options: ConfigOptions
): C15TInstance<PluginTypes> => {
	const contextPromise = init(options);

	/**
	 * Processes incoming requests and routes them to the appropriate handler
	 * using the Result pattern for error handling
	 *
	 * @param request - The incoming web request
	 * @returns A Promise resolving to a Result containing a web response
	 */
	const handler = async (
		request: Request
	): Promise<C15TResultAsync<Response>> => {
		const contextResult = await contextPromise;

		// Map the Result to a ResultAsync for proper chaining
		return contextResult.asyncAndThen((ctx: C15TContext) => {
			const basePath = ctx.options.basePath || '/api/c15t';
			const url = new URL(request.url);
			if (ctx.options.baseURL) {
				// If baseURL is provided but doesn't include the basePath, add it
				const baseURL = new URL(ctx.options.baseURL);
				if (!baseURL.pathname || baseURL.pathname === '/') {
					ctx.options.baseURL = `${baseURL.origin}${basePath}`;
					ctx.baseURL = ctx.options.baseURL;
				}
			} else {
				const baseURL =
					getBaseURL(undefined, basePath) || `${url.origin}${basePath}`;
				ctx.options.baseURL = baseURL;
				ctx.baseURL = baseURL;
			}

			// Extract trusted origins logic to avoid nested ternaries
			let originsFromOptions: string[] = [];
			if (options.trustedOrigins) {
				originsFromOptions = Array.isArray(options.trustedOrigins)
					? options.trustedOrigins
					: options.trustedOrigins(request);
			}

			ctx.trustedOrigins = [
				...originsFromOptions,
				ctx.options.baseURL || '',
				url.origin,
			];

			try {
				const { handler } = router(ctx, options);

				// Use safeResultAsync instead of fromPromise
				return safeResultAsync(
					handler(request),
					BASE_ERROR_CODES.REQUEST_HANDLER_ERROR
				);
			} catch (error) {
				const safeErrorMessage =
					error instanceof Error
						? error.message.split('\n')[0]
						: 'An unknown error occurred';
				return failAsync(`Error processing request: ${safeErrorMessage}`, {
					code: BASE_ERROR_CODES.REQUEST_HANDLER_ERROR,
					status: 500,
					data: { url: request.url },
				});
			}
		});
	};

	/**
	 * Method to get API endpoints using the Result pattern
	 *
	 * @returns A Promise resolving to a Result containing the available API endpoints
	 */
	const getApi = async (): Promise<
		C15TResultAsync<FilterActions<ReturnType<typeof router>['endpoints']>>
	> => {
		const contextResult = await contextPromise;

		return contextResult.asyncAndThen((context: C15TContext) => {
			// Make sure context has a valid baseURL before calling router
			if (!context.baseURL) {
				try {
					const basePath = context.options.basePath || '/api/c15t';
					const baseURL = getBaseURL(context.options.baseURL, basePath);
					if (baseURL) {
						context.baseURL = baseURL;
					}
				} catch (error) {
					return failAsync(
						`Failed to determine base URL: ${error instanceof Error ? error.message : String(error)}`,
						{
							code: BASE_ERROR_CODES.API_RETRIEVAL_ERROR,
						}
					);
				}
			}

			try {
				const { endpoints } = router(context, options);
				// Convert endpoints to the expected FilterActions type and wrap in okAsync
				const typedEndpoints = endpoints as unknown as FilterActions<
					ReturnType<typeof router>['endpoints']
				>;
				return okAsync(typedEndpoints);
			} catch (error) {
				return failAsync(
					`Failed to get API endpoints: ${error instanceof Error ? error.message : String(error)}`,
					{
						code: BASE_ERROR_CODES.API_RETRIEVAL_ERROR,
						data: { error },
					}
				);
			}
		});
	};

	// Create and return the simplified instance with access to the context
	return {
		handler,
		getApi,
		options,
		$context: contextPromise,
	};
};
