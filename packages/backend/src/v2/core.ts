import { createLogger } from '@doubletie/logger';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { ORPCError } from '@orpc/server';
import { CORSPlugin } from '@orpc/server/plugins';
import defu from 'defu';
import { createCORSOptions } from '~/v2/middleware/cors';
import { processCors } from '~/v2/middleware/cors/process-cors';
import {
	createDocsUI,
	createOpenAPIConfig,
	createOpenAPISpec,
} from '~/v2/middleware/openapi';
import { getIpAddress } from '~/v2/middleware/process-ip';
import { router } from '~/v2/router';
import type { DeepPartial } from '~/v2/types';
import type { C15TContext, C15TOptions } from '~/v2/types';
import { init } from './init';
import { withRequestSpan } from './utils/create-telemetry-options';

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
 * @remarks
 * The C15TInstance provides the main interface for interacting with the consent
 * management system. It includes methods for handling requests, accessing API
 * endpoints, and managing the system's configuration.
 */
export interface C15TInstance {
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
	options: C15TOptions;

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

/**
 * Creates a new c15t consent management instance.
 *
 * This version provides a unified handler that works with oRPC to handle requests.
 */
export const c15tInstance = (options: C15TOptions) => {
	const context = init(options);

	// Replace the inline corsOptions with the imported one
	const corsOptions = createCORSOptions(options.trustedOrigins);

	// Create the oRPC handler with plugins
	const rpcHandler = new OpenAPIHandler(router, {
		plugins: [new CORSPlugin(corsOptions)],
	});

	// Set up OpenAPI configuration
	const openApiConfig = createOpenAPIConfig(options);
	const getDocsUI = () => createDocsUI(options);

	/**
	 * Add telemetry tracking to the context
	 */
	const processTelemetry = (request: Request, context: C15TContext) => {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// // Add a span to the context that can be accessed by handlers
		withRequestSpan(
			method,
			path,
			async () => {
				// This callback is intentionally empty - we're only creating the span
				// The span automatically tracks the current execution context and
				// will be associated with the request processing that follows
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
	 * Handle OpenAPI spec requests
	 */
	const handleOpenApiSpecRequest = async (
		url: URL
	): Promise<Response | null> => {
		if (openApiConfig.enabled && url.pathname === openApiConfig.specPath) {
			const getOpenAPISpec = createOpenAPISpec(context, options);
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
	 * Create error response for ORPCError
	 */
	const createORPCErrorResponse = (
		error: ORPCError<string, unknown>
	): Response => {
		const sanitizedMessage = error.message.replace(
			/[^\w\s.,;:!?()[\]{}'"+-]/g,
			''
		);

		return new Response(
			JSON.stringify({
				code: error.code,
				message: sanitizedMessage,
				data: error.data ?? {},
				status: error.status,
				defined: true,
			}),
			{
				status: error.status,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	};

	/**
	 * Create error response for unknown errors
	 */
	const createUnknownErrorResponse = (error: unknown): Response => {
		const message = error instanceof Error ? error.message : String(error);
		// More safely determine the status code with proper type checks
		let status = 500;
		if (error instanceof Error && 'status' in error) {
			const statusValue = (error as { status: unknown }).status;
			if (
				typeof statusValue === 'number' &&
				statusValue >= 100 &&
				statusValue < 600
			) {
				status = statusValue;
			}
		}

		return new Response(
			JSON.stringify({
				code: 'INTERNAL_SERVER_ERROR',
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
		const { logger } = ctx;

		const enrichedContext: C15TContext = {
			...context,
			ipAddress: getIpAddress(request, options),
			userAgent: request.headers.get('user-agent') || undefined,
		};

		processCors(request, enrichedContext, options.trustedOrigins);
		processTelemetry(request, enrichedContext);

		logger.debug?.('Handling prefix', {
			prefix: (options.basePath as `/${string}`) || '/',
		});

		const { matched, response } = await rpcHandler.handle(request, {
			prefix: (options.basePath as `/${string}`) || '/',
			context: enrichedContext,
		});

		// Return the response if handler matched
		if (matched && response) {
			logger.debug('Handler matched', {
				request,
				matched,
				response,
			});
			return response;
		}

		logger.debug('No handler matched', {
			request,
			matched,
			response,
		});
		// If no handler matched, return 404
		return new Response('Not Found', { status: 404 });
	};

	/**
	 * Handle an incoming request using oRPC
	 */
	const handler = async (
		request: Request,
		ctxOverride?: DeepPartial<C15TContext>
	): Promise<Response> => {
		try {
			const url = new URL(request.url);

			// Add this debug log:
			createLogger(options.logger)?.debug?.('Incoming request', {
				method: request.method,
				pathname: url.pathname,
			});

			// Check for OpenAPI spec or docs UI requests
			const openApiResponse = await handleOpenApiSpecRequest(url);
			if (openApiResponse) {
				return openApiResponse;
			}

			const docsResponse = handleDocsUiRequest(url);
			if (docsResponse) {
				return docsResponse;
			}

			const ctx = defu(ctxOverride || {}, context) as C15TContext;

			// After options is used
			const basePath = options.basePath;
			createLogger(options.logger)?.debug?.('[c15t] Using basePath', {
				basePath,
			});

			// Add this debug log:
			createLogger(options.logger)?.debug?.('[c15t] Routing request', {
				method: request.method,
				url: request.url,
				prefix: basePath,
			});

			// Handle API request
			return await handleApiRequest(request, ctx);
		} catch (error) {
			// Log the error
			const logger = options.logger ? createLogger(options.logger) : console;
			logger.error('Request handling error:', error);

			// Handle different error types
			if (error instanceof ORPCError) {
				return createORPCErrorResponse(error);
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
		$context: context,

		// Export router for direct access
		router,

		// Request handler for standard environments
		handler,

		// Next.js route handlers
		...createNextHandlers(),

		// OpenAPI functionality
		getOpenAPISpec: () => {
			const getOpenAPISpec = createOpenAPISpec(context, options);

			return getOpenAPISpec();
		},
		getDocsUI,
	};
};

export type { ContractsInputs, ContractsOutputs } from '~/v2/contracts';
export type { C15TContext, C15TOptions } from './types';
export { defineConfig } from './define-config';
