/**
 * Core c15t Consent Management System
 *
 * This module provides the main factory function for creating c15t instances.
 * It handles initialization of the consent management context, sets up request handlers,
 * manages plugin integration, and exposes the necessary API endpoints.
 *
 * The core module is responsible for:
 * - Initializing the consent management context
 * - Setting up request routing and URL configuration
 * - Managing trusted origins for CORS
 * - Integrating and exposing plugin functionality
 * - Providing type inference utilities for TypeScript users
 *
 * @example
 * ```typescript
 * import { c15t } from '@c15t/core';
 *
 * // Create a c15t instance with configuration
 * const consentManager = c15t({
 *   secret: process.env.SECRET_KEY,
 *   storage: memoryAdapter(),
 *   plugins: [
 *     geoPlugin(),
 *     analyticsPlugin()
 *   ]
 * });
 *
 * // Use the handler in your framework of choice
 * export default consentManager.handler;
 * ```
 */
import { init } from './init';
import { router } from './api/index';
import type { c15tOptions } from './types/options';
import type {
	InferPluginErrorCodes,
	InferPluginTypes,
	ConsentContext,
	Expand,
} from './types';
import { getBaseURL } from './utils/url';
import type { FilterActions } from './types';
import { BASE_ERROR_CODES } from './error/codes';

/**
 * Utility type for adding JSDoc comments to types
 *
 * This type helps maintain documentation when extending types by
 * ensuring that both the original type and documentation are preserved.
 *
 * @template T - The original type
 * @template D - The documentation type
 */
export type WithJsDoc<T, D> = Expand<T & D>;

/**
 * Creates a c15t consent management system instance
 *
 * This is the main factory function that creates a fully configured c15t instance.
 * It initializes the consent management context, sets up request handling,
 * configures plugins, and exposes the necessary API endpoints.
 *
 * @template O - The specific c15tOptions type with plugin types
 * @param options - Configuration options for the c15t instance
 * @returns A fully initialized c15t instance with request handler and API
 *
 * @example
 * ```typescript
 * // Create a c15t instance with custom storage and plugins
 * const c15tInstance = c15t({
 *   secret: 'your-secure-secret-key',
 *   storage: sqliteAdapter({
 *     filename: './consent.db'
 *   }),
 *   cookies: {
 *     prefix: 'myapp',
 *     domain: '.example.com'
 *   },
 *   plugins: [
 *     geoPlugin({ defaultJurisdiction: 'us-ca' }),
 *     analyticsPlugin({ providers: [...] })
 *   ]
 * });
 *
 * // Use in an Express app
 * app.use('/api/consent', (req, res) => {
 *   c15tInstance.handler(new Request(req.url, {
 *     method: req.method,
 *     headers: req.headers,
 *     body: req.body
 *   })).then(response => {
 *     res.status(response.status);
 *     for (const [key, value] of response.headers.entries()) {
 *       res.setHeader(key, value);
 *     }
 *     return response.text();
 *   }).then(body => {
 *     res.send(body);
 *   });
 * });
 * ```
 */
export const c15t = <O extends c15tOptions>(options: O) => {
	const consentContextPromise = init(options);

	// Create a handler that awaits context initialization
	const handler = async (request: Request): Promise<Response> => {
		const ctx = await consentContextPromise;

		// Set up base path and URL
		const basePath = ctx.options.basePath || '/api/consent';
		const url = new URL(request.url);

		if (!ctx.options.baseURL) {
			const baseURL =
				getBaseURL(undefined, basePath) || `${url.origin}${basePath}`;
			ctx.options.baseURL = baseURL;
			ctx.baseURL = baseURL;
		}

		// Set trusted origins
		ctx.trustedOrigins = [
			...(options.trustedOrigins
				? Array.isArray(options.trustedOrigins)
					? options.trustedOrigins
					: options.trustedOrigins(request)
				: []),
			ctx.options.baseURL ?? url.origin,
			url.origin,
		];

		// Get router handler and process request
		const { handler: routerHandler } = router(ctx, options);
		return routerHandler(request);
	};

	// Store additional plugin error codes
	const errorCodes = options.plugins?.reduce((acc, plugin) => {
		if (plugin.$ERROR_CODES) {
			return Object.assign({}, acc, plugin.$ERROR_CODES);
		}
		return acc;
	}, {});

	// Get API endpoints (lazy-loaded)
	const getApi = async () => {
		const context = await consentContextPromise;
		const { endpoints } = router(context, options);
		return endpoints;
	};

	// Create a promise for the API endpoints
	const apiPromise = getApi();

	return {
		handler,
		// We're type-casting this for now since the API is loaded asynchronously
		api: {} as FilterActions<ReturnType<typeof router>['endpoints']>,
		options: options as O,
		$context: consentContextPromise,
		$Infer: {} as {
			Consent: {
				Context: ConsentContext;
				Record: InferPluginTypes<O>;
			};
			Error: InferPluginErrorCodes<O> & typeof BASE_ERROR_CODES;
		},
		$ERROR_CODES: Object.assign(
			{},
			BASE_ERROR_CODES,
			errorCodes || {}
		) as InferPluginErrorCodes<O> & typeof BASE_ERROR_CODES,
	};
};

/**
 * Type definition for a c15t instance
 *
 * This type represents a fully initialized c15t consent management system
 * instance with all its methods and properties. It is the return type of
 * the `c15t()` factory function.
 *
 * The instance includes:
 * - A request handler compatible with Web Standard Request/Response
 * - Access to the configured API endpoints
 * - Original configuration options
 * - Error codes from the core system and plugins
 * - Access to the underlying consent context (for advanced usage)
 */
export type c15tInstance = {
	/**
	 * Request handler for processing incoming consent-related requests
	 *
	 * This function processes Web Standard Request objects and returns Response objects,
	 * making it compatible with modern web frameworks and environments.
	 *
	 * @param request - A standard Web Request object
	 * @returns A Promise resolving to a Web Response object
	 */
	handler: (request: Request) => Promise<Response>;

	/**
	 * API endpoints for interacting with the consent management system
	 *
	 * Provides access to all registered endpoints from core and plugins.
	 */
	api: FilterActions<ReturnType<typeof router>['endpoints']>;

	/**
	 * Configuration options used to create the instance
	 */
	options: c15tOptions;

	/**
	 * Error codes from the core system and all registered plugins
	 *
	 * These can be used for error handling and internationalization.
	 */
	$ERROR_CODES: typeof BASE_ERROR_CODES;

	/**
	 * Promise that resolves to the fully initialized consent context
	 *
	 * This is mainly for advanced usage scenarios where direct access
	 * to the context is required.
	 */
	$context: Promise<ConsentContext>;
};
