import { type Logger, createLogger } from '@doubletie/logger';
import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { CORSPlugin } from '@orpc/server/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { C15TContext, C15TOptions, C15TPlugin } from '~/types';
import packageJson from '../package.json';
import { init } from './init';
import { withRequestSpan } from './pkgs/api-router/telemetry';
import { isOriginTrusted } from './pkgs/api-router/utils/cors';
import { getIp } from './pkgs/api-router/utils/ip';
import { router } from './router';
/**
 * Type representing an API route
 */
export type Route = {
	path: string;
	method: string;
	description?: string;
};

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
 * All asynchronous operations return Promises for consistent error handling.
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
	 * @returns A Promise containing the HTTP response
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   const response = await instance.handler(request);
	 *   sendResponse(response);
	 * } catch (error) {
	 *   handleError(error);
	 * }
	 * ```
	 */
	handler: (request: Request) => Promise<Response>;

	/**
	 * The configuration options used for this instance.
	 */
	options: C15TOptions<PluginTypes>;

	/**
	 * Access to the underlying context.
	 */
	$context: Promise<C15TContext>;

	/**
	 * Access to the router for direct usage.
	 */
	router: typeof router;

	/**
	 * Generates and returns the OpenAPI specification as a JSON object.
	 *
	 * @returns A Promise containing the OpenAPI specification
	 */
	getOpenAPISpec: () => Promise<Record<string, unknown>>;

	/**
	 * Returns an HTML document with the API documentation UI.
	 *
	 * @returns An HTML string with the API reference UI
	 */
	getDocsUI: () => string;
}

// Define middleware context interface
interface MiddlewareContext {
	logger?: Logger;
	adapter: unknown;
	registry: unknown;
	generateId: unknown;
	ip?: string;
	origin?: string;
	trustedOrigin?: boolean;
	path?: string;
	method?: string;
	headers?: Headers;
	userAgent?: string;
	[key: string]: unknown;
}

// Define advanced options interface to satisfy linter
interface AdvancedOptions {
	cors?: {
		allowedOrigins?: string[];
	};
	ipAddress?: {
		disableIpTracking?: boolean;
		ipAddressHeaders?: string[];
	};
	[key: string]: unknown;
}

/**
 * Creates a new c15t consent management instance.
 *
 * This version provides a unified handler that works with oRPC to handle requests.
 */
export const c15tInstance = <PluginTypes extends C15TPlugin[] = C15TPlugin[]>(
	options: C15TOptions<PluginTypes>
) => {
	// Initialize context
	const contextPromise = init(options);

	// Set up CORS configuration
	const advanced = options.advanced as AdvancedOptions | undefined;
	const corsOptions = advanced?.cors?.allowedOrigins
		? {
				origin: advanced.cors.allowedOrigins.includes('*')
					? '*'
					: advanced.cors.allowedOrigins,
			}
		: {};

	// Create the oRPC handler with plugins
	const rpcHandler = new OpenAPIHandler(router, {
		plugins: [new CORSPlugin(corsOptions)],
	});

	// Initialize OpenAPI generator with schema converters
	const openAPIGenerator = new OpenAPIGenerator({
		schemaConverters: [new ZodToJsonSchemaConverter()],
	});

	// Set up OpenAPI configuration with defaults
	const openApiConfig = {
		enabled: true,
		specPath: '/spec.json',
		docsPath: '/docs',
		...(options.openapi || {}),
	};

	// Default OpenAPI options
	const defaultOpenApiOptions = {
		info: {
			title: options.appName || 'c15t API',
			version: packageJson.version,
			description: 'API for consent management',
		},
		servers: [{ url: '/' }],
		security: [{ bearerAuth: [] }],
		// components: {
		// 	securitySchemes: {
		// 		bearerAuth: {
		// 			type: 'http',
		// 			scheme: 'bearer',
		// 		},
		// 	},
		// },
	};

	/**
	 * Process IP tracking and add it to the context
	 */
	const processIp = (request: Request, context: MiddlewareContext) => {
		const ip = getIp(request, options);
		if (ip) {
			context.ip = ip;
		}
		return context;
	};

	/**
	 * Process CORS validation and add it to the context
	 */
	const processCors = (request: Request, context: MiddlewareContext) => {
		const origin = request.headers.get('origin');
		if (origin && advanced?.cors?.allowedOrigins) {
			const trusted = isOriginTrusted(
				origin,
				advanced.cors.allowedOrigins,
				context.logger
			);

			context.origin = origin;
			context.trustedOrigin = trusted;
		}
		return context;
	};

	/**
	 * Add telemetry tracking to the context
	 */
	const processTelemetry = (request: Request, context: MiddlewareContext) => {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// Add a span to the context that can be accessed by handlers
		withRequestSpan(
			method,
			path,
			async () => {
				// This is intentionally empty, we're just creating the span
				// The actual request processing happens elsewhere
			},
			options
		);

		// Add path and method to context for easier access
		context.path = path;
		context.method = method;
		context.headers = request.headers;
		context.userAgent = request.headers.get('user-agent') || undefined;

		return context;
	};

	/**
	 * Generate the OpenAPI specification document
	 */
	const getOpenAPISpec = (async (): Promise<Record<string, unknown>> => {
		// Memoise once per process
		if (getOpenAPISpec.cached) {
			return getOpenAPISpec.cached;
		}

		// Start with our defaults
		const mergedOptions = { ...defaultOpenApiOptions };

		// If user provided options, merge them with defaults
		if (openApiConfig.options) {
			// biome-ignore lint: OpenAPI options are dynamically merged
			const userOptions = openApiConfig.options as Record<string, any>;

			// Handle nested info object (title, description, version) specially
			if (userOptions.info) {
				mergedOptions.info = {
					...defaultOpenApiOptions.info,
					...userOptions.info,
				};
			}

			// For all other top-level properties, override defaults with user settings
			for (const [key, value] of Object.entries(userOptions)) {
				if (key !== 'info') {
					(mergedOptions as Record<string, unknown>)[key] = value;
				}
			}
		}

		// We need to cast to the expected type due to incompatibilities between the types
		// This is safe as we control the options format and it's compatible with what the generator expects
		const spec = await openAPIGenerator.generate(
			router,
			mergedOptions as Record<string, unknown>
		);
		getOpenAPISpec.cached = spec;
		return spec;
	}) as (() => Promise<Record<string, unknown>>) & {
		cached?: Record<string, unknown>;
	};

	/**
	 * Generate the default UI for API documentation
	 */
	const getDocsUI = () => {
		// If a custom template is provided, use it
		if (openApiConfig.customUiTemplate) {
			return openApiConfig.customUiTemplate;
		}

		// Otherwise, return the default Scalar UI
		return `
    <!doctype html>
    <html>
      <head>
        <title>${options.appName || 'c15t API'} Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
      </head>
      <body>
        <script
          id="api-reference"
          data-url="${encodeURI(openApiConfig.specPath)}}">
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
    `;
	};

	/**
	 * Handle OpenAPI spec requests
	 */
	const handleOpenApiSpecRequest = async (
		url: URL
	): Promise<Response | null> => {
		if (openApiConfig.enabled && url.pathname === openApiConfig.specPath) {
			const spec = await getOpenAPISpec();
			return new Response(JSON.stringify(spec), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return null;
	};

	/**
	 * Handle API docs UI requests
	 */
	const handleDocsUiRequest = (url: URL): Response | null => {
		if (openApiConfig.enabled && url.pathname === openApiConfig.docsPath) {
			const html = getDocsUI();
			return new Response(html, {
				status: 200,
				headers: {
					'Content-Type': 'text/html',
					'Content-Security-Policy':
						"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;",
				},
			});
		}
		return null;
	};

	/**
	 * Create error response for DoubleTieError
	 */
	const createDoubleTieErrorResponse = (error: DoubleTieError): Response => {
		return new Response(
			JSON.stringify({
				code: error.code,
				message: error.message,
				data: error.meta,
				status: error.statusCode,
				defined: true,
			}),
			{
				status: error.statusCode,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	};

	/**
	 * Create error response for unknown errors
	 */
	const createUnknownErrorResponse = (error: unknown): Response => {
		const message = error instanceof Error ? error.message : String(error);
		const status =
			error instanceof Error && 'status' in error
				? (error as { status: number }).status
				: 500;

		return new Response(
			JSON.stringify({
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				message,
				status,
				defined: true,
				data: {},
			}),
			{
				status,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	};

	/**
	 * Handle API requests via oRPC
	 */
	const handleApiRequest = async (
		request: Request,
		ctx: C15TContext
	): Promise<Response> => {
		// Create context for the handler with c15t specifics
		const orpcContext: MiddlewareContext = {
			adapter: ctx.adapter,
			registry: ctx.registry,
			logger: ctx.logger,
			generateId: ctx.generateId,
			headers: request.headers,
			userAgent: request.headers.get('user-agent') || undefined,
		};

		// Apply middleware processing to enrich the context
		processIp(request, orpcContext);
		processCors(request, orpcContext);
		processTelemetry(request, orpcContext);

		// Use oRPC handler to handle the request with our enhanced context
		const handlerContext = orpcContext as Record<string, unknown>;
		const { matched, response } = await rpcHandler.handle(request, {
			prefix: '/',
			context: handlerContext,
		});

		// Return the response if handler matched
		if (matched && response) {
			return response;
		}

		// If no handler matched, return 404
		return new Response('Not Found', { status: 404 });
	};

	/**
	 * Handle an incoming request using oRPC
	 */
	const handler = async (request: Request): Promise<Response> => {
		try {
			const url = new URL(request.url);

			// Check for OpenAPI spec or docs UI requests
			const openApiResponse = await handleOpenApiSpecRequest(url);
			if (openApiResponse) {
				return openApiResponse;
			}

			const docsResponse = handleDocsUiRequest(url);
			if (docsResponse) {
				return docsResponse;
			}

			// Get context, handling Result type properly
			const ctxResult = await contextPromise;
			if (!ctxResult.isOk()) {
				throw ctxResult.error;
			}
			const ctx = ctxResult.value;

			// Handle API request
			return await handleApiRequest(request, ctx);
		} catch (error) {
			// Log the error
			const logger = options.logger ? createLogger(options.logger) : console;
			logger.error('Request handling error:', error);

			// Handle different error types
			if (error instanceof DoubleTieError) {
				return createDoubleTieErrorResponse(error);
			}

			return createUnknownErrorResponse(error);
		}
	};

	// Create Next.js-compatible route handlers
	const createNextHandlers = () => {
		const nextHandler = async (request: Request) => {
			return await handler(request);
		};

		return {
			GET: nextHandler,
			POST: nextHandler,
			PUT: nextHandler,
			PATCH: nextHandler,
			DELETE: nextHandler,
			OPTIONS: nextHandler,
			HEAD: nextHandler,
		};
	};

	// Return the instance
	return {
		options,

		// Unwrap the Result when exposing the context
		$context: contextPromise.then((result) => {
			if (!result.isOk()) {
				throw result.error;
			}
			return result.value;
		}),

		// Export router for direct access
		router,

		// Request handler for standard environments
		handler,

		// Next.js route handlers
		...createNextHandlers(),

		// OpenAPI functionality
		getOpenAPISpec,
		getDocsUI,
	};
};

export type { C15TPlugin, C15TOptions, C15TContext };
export type { ContractsInputs, ContractsOutputs } from './contracts';
