import {
	APIError,
	type Endpoint,
	type Middleware,
	type UnionToIntersection,
	createRouter,
} from 'better-call';
import { logger } from '~/pkgs/logger';
import type { C15TContext, C15TOptions, C15TPlugin } from '~/types';
import { toEndpoints } from '../endpoints/converter';
import { getIp } from '../utils/ip';
import type { DoubleTieEndpoint } from './endpoint';

/**
 * Retrieves and configures endpoints from plugins and core functionality
 *
 * This function collects endpoints from plugins, combines them with
 * base endpoints, and builds an API object with properly configured
 * handlers.
 *
 * @remarks
 * Plugin endpoints are merged with core endpoints, with core endpoints
 * taking precedence in case of naming conflicts.
 *
 * @typeParam ContextType - The specific context type extending C15TContext
 * @typeParam OptionsType - Configuration options type extending C15TOptions
 * @param ctx - The application context (or promise resolving to it)
 * @param options - Configuration options for the API system
 * @param baseEndpoints - The core endpoints to include
 * @param healthCheckEndpoint - The health check endpoint for system monitoring
 * @returns Object containing API handlers and middleware configurations
 */
export function getEndpoints<
	ContextType extends C15TContext,
	OptionsType extends C15TOptions,
>(
	ctx: Promise<ContextType> | ContextType,
	options: OptionsType,
	baseEndpoints: Record<string, Endpoint>,
	healthCheckEndpoint: Endpoint
) {
	const pluginEndpoints = options.plugins?.reduce<Record<string, Endpoint>>(
		(acc, plugin) => {
			if (plugin.endpoints) {
				Object.assign(acc, plugin.endpoints);
			}
			return acc;
		},
		{}
	);

	/**
	 * Type representing the intersection of all plugin endpoint types
	 *
	 * @internal
	 */
	type PluginEndpoint = UnionToIntersection<
		OptionsType['plugins'] extends Array<infer PluginType>
			? PluginType extends C15TPlugin
				? PluginType extends {
						endpoints: infer EndpointType;
					}
					? EndpointType
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
	>;

	const middlewares =
		options.plugins
			?.map((plugin) =>
				plugin.middlewares?.map((m) => {
					const middleware = (async (context: { context: ContextType }) => {
						return m.middleware({
							...context,
							context: {
								...ctx,
								...context.context,
							},
						});
					}) as Middleware;
					middleware.options = m.middleware.options;
					return {
						path: m.path,
						middleware,
					};
				})
			)
			.filter(
				(plugin): plugin is NonNullable<typeof plugin> => plugin !== undefined
			)
			.flat() || [];

	const endpoints = {
		...baseEndpoints,
		...pluginEndpoints,
		ok: healthCheckEndpoint,
	};

	// Add type assertion to fix the type compatibility issue
	const api = toEndpoints(
		endpoints as unknown as Record<string, DoubleTieEndpoint>,
		ctx
	);

	return {
		api: api as unknown as typeof endpoints & PluginEndpoint,
		middlewares,
	};
}

/**
 * Creates a router for handling API requests
 *
 * Sets up a fully configured API router with error handling, middleware integration,
 * plugin support, and standardized response processing.
 *
 * @remarks
 * This router factory handles common API concerns including:
 * - Base URL and path prefix configuration
 * - Plugin middleware registration
 * - Error handling and logging
 * - Request/response lifecycle hooks
 * - OpenAPI documentation generation
 *
 * It allows for a modular approach to API design where middleware, plugins, and
 * endpoints can be composed independently and registered with the router.
 *
 * @typeParam ContextType - The specific context type extending C15TContext
 * @typeParam OptionsType - Configuration options type extending C15TOptions
 * @param ctx - The initialized application context
 * @param options - Configuration options for the API system
 * @param baseEndpoints - The core endpoints to include in the API
 * @param healthCheckEndpoint - The health check endpoint for monitoring
 * @param coreMiddlewares - Core middlewares to apply to all routes
 * @returns A configured router with handler and endpoint functions
 *
 * @example
 * ```typescript
 * // Create a router with authentication and logging
 * const router = createApiRouter(
 *   appContext,
 *   {
 *     baseURL: 'https://api.example.com',
 *     plugins: [authPlugin, loggingPlugin],
 *     onAPIError: {
 *       throw: false,
 *       onError: (error, ctx) => {
 *         // Custom error handling
 *         logger.error('API error', { error, path: ctx.path });
 *         return new Response('Custom error response', { status: 500 });
 *       }
 *     }
 *   },
 *   {
 *     getUser: userEndpoints.getUser,
 *     updateUser: userEndpoints.updateUser
 *   },
 *   healthEndpoint,
 *   [
 *     {
 *       path: '/users/**',
 *       middleware: authMiddleware
 *     }
 *   ]
 * );
 *
 * // Use the router in your application
 * app.use('/api', router.handler);
 * ```
 */
export const createApiRouter = <
	ContextType extends C15TContext,
	OptionsType extends C15TOptions,
>(
	ctx: ContextType,
	options: OptionsType,
	baseEndpoints: Record<string, Endpoint>,
	healthCheckEndpoint: Endpoint,
	coreMiddlewares: { path: string; middleware: Middleware }[]
) => {
	const { api, middlewares } = getEndpoints(
		ctx,
		options,
		baseEndpoints,
		healthCheckEndpoint
	);

	// Check for baseURL and properly handle it
	let basePath = '';
	try {
		if (ctx.baseURL) {
			const url = new URL(ctx.baseURL);
			basePath = url.pathname;
		}
	} catch {
		basePath = '/api/doubletie';
	}
	// Ensure we have a valid basePath
	if (!basePath || basePath === '/') {
		basePath = '/api/doubletie';
	}

	/**
	 * Configure and create the router instance
	 *
	 * @internal
	 */
	const routerInstance = createRouter(api, {
		routerContext: ctx,
		openapi: {
			disabled: false,
		},
		basePath,
		routerMiddleware: [...coreMiddlewares, ...middlewares],
		async onRequest(req) {
			// Add IP address to context
			(ctx as C15TContext).ipAddress = getIp(req, options);
			(ctx as C15TContext).userAgent = req.headers.get('user-agent');

			for (const plugin of ctx.options.plugins || []) {
				if (plugin.onRequest) {
					const response = await plugin.onRequest(req, ctx);
					if (response && 'response' in response) {
						return response.response;
					}
				}
			}
			return req;
		},

		/**
		 * Handle response processing through plugins
		 *
		 * @internal
		 * @param res - The response to process
		 * @returns The processed response
		 */
		async onResponse(res) {
			for (const plugin of ctx.options.plugins || []) {
				if (plugin.onResponse) {
					const response = await plugin.onResponse(res, ctx);
					if (response) {
						return response.response;
					}
				}
			}
			return res;
		},

		/**
		 * Handle errors that occur during request processing
		 *
		 * @internal
		 * @param e - The error that occurred
		 */
		onError(e) {
			if (e instanceof APIError && e.status === 'FOUND') {
				return;
			}

			if (options.onAPIError?.throw) {
				throw e;
			}

			const errorCode =
				e instanceof APIError ? e.status : 'INTERNAL_SERVER_ERROR';

			if (errorCode === 'UNAUTHORIZED') {
				logger.warn('Unauthorized access', {
					error: e instanceof Error ? e.message : String(e),
					// biome-ignore lint/suspicious/noExplicitAny: its okay
					path: e instanceof APIError ? (e as any).path : undefined,
				});
			} else if (errorCode === 'NOT_FOUND') {
				logger.debug('Resource not found', {
					error: e instanceof Error ? e.message : String(e),
					// biome-ignore lint/suspicious/noExplicitAny: its okay
					path: e instanceof APIError ? (e as any).path : undefined,
				});
			} else {
				logger.error('API error', { error: e });
			}
		},
	});

	const _handler = routerInstance.handler;
	routerInstance.handler = async (
		...args: Parameters<typeof _handler>
	): Promise<Response> => {
		// const [req] = args;
		try {
			return await _handler(...args);
		} catch (error) {
			// Log any uncaught errors
			if (options.onAPIError?.onError) {
				try {
					// Call the error handler and handle both void and Response returns
					const result = options.onAPIError.onError(error, ctx);

					// Use type guard to ensure we're returning a Response
					if (result && result instanceof Response) {
						// Using as Response to help TypeScript understand we've validated the type
						return result as Response;
					}
				} catch (handlerError) {
					// If the error handler itself throws, log that too
					logger.error('Error handler failed', { error: handlerError });
				}

				// If we reach here, fall back to default response
				return new Response(
					JSON.stringify({ error: 'Error handling failed' }),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					}
				);
			}

			// Add context to error if not already an APIError
			if (!(error instanceof APIError)) {
				logger.error('Unhandled API error', { error });
				return new Response(
					JSON.stringify({ error: 'Internal Server Error' }),
					{
						status: 500,
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);
			}

			return new Response(JSON.stringify({ error: error.message }), {
				status: typeof error.status === 'number' ? error.status : 500,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
	};

	return routerInstance;
};
