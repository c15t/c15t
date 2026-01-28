import { createLogger } from '@c15t/logger';
import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { openAPIRouteHandler } from 'hono-openapi';
import { validateRequestAuth } from '~/middleware/auth';
import { createCORSOptions } from '~/middleware/cors';
import { createOpenAPIConfig } from '~/middleware/openapi';
import { getIpAddress } from '~/middleware/process-ip';
import type { C15TContext, C15TOptions } from '~/types';
import { init } from './init';
import { createConsentRoutes } from './routes/consent';
// Import route handlers
import { createInitRoute } from './routes/init';
import { createStatusRoute } from './routes/status';
import { createSubjectRoutes } from './routes/subject';
import { withRequestSpan } from './utils/create-telemetry-options';
import { version } from './version';

/**
 * Type representing an API route
 */
export type Route = {
	path: string;
	method: string;
	description?: string;
};

/**
 * Hono app type with c15t context
 */
export type C15TApp = Hono<{ Variables: { c15tContext: C15TContext } }>;

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
	$context: C15TContext;

	/**
	 * Access to the Hono app for direct usage.
	 */
	app: C15TApp;

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
 * This version uses Hono as the HTTP framework with OpenAPI support.
 */
export const c15tInstance = (options: C15TOptions): C15TInstance => {
	const context = init(options);
	const logger = createLogger(options.logger);

	// Create the Hono app
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	// Set up OpenAPI configuration
	const openApiConfig = createOpenAPIConfig(options);
	const basePath = options.basePath || '/';

	// CORS middleware
	const corsOptions = createCORSOptions(options.trustedOrigins);
	app.use('*', cors(corsOptions));

	// Compression middleware
	app.use('*', compress());

	// Context middleware - enriches each request with c15t context
	app.use('*', async (c, next) => {
		const request = c.req.raw;

		// Check API key authentication
		const apiKeyAuthenticated = validateRequestAuth(
			request.headers,
			options.advanced?.apiKeys
		);

		const enrichedContext: C15TContext = {
			...context,
			ipAddress: getIpAddress(request, options),
			userAgent: request.headers.get('user-agent') || undefined,
			apiKeyAuthenticated,
			path: c.req.path,
			method: c.req.method,
			headers: request.headers,
		};

		// Add telemetry span
		withRequestSpan(
			c.req.method,
			c.req.path,
			async () => {
				// Span tracks the request
			},
			options
		);

		c.set('c15tContext', enrichedContext);
		await next();
	});

	// OpenAPI spec endpoint
	if (openApiConfig.enabled) {
		app.get(
			openApiConfig.specPath,
			openAPIRouteHandler(app, {
				documentation: {
					openapi: '3.1.0',
					info: {
						title: options.appName || 'c15t API',
						version,
						description: 'API for consent management',
					},
					servers: [{ url: basePath }],
					components: {
						securitySchemes: {
							bearerAuth: {
								type: 'http',
								scheme: 'bearer',
							},
						},
					},
				},
			})
		);

		// Docs UI endpoint
		// The spec URL needs to include the basePath since it's used by the browser
		const publicSpecUrl = `${basePath}${openApiConfig.specPath}`.replace(
			/\/+/g,
			'/'
		);
		app.get(
			openApiConfig.docsPath,
			apiReference({
				spec: {
					url: publicSpecUrl,
				},
				pageTitle: `${options.appName || 'c15t API'} Documentation`,
			})
		);
	}

	// Mount routes - using plural nouns for REST conventions
	app.route('/init', createInitRoute(options));
	app.route('/subjects', createSubjectRoutes());
	app.route('/consents', createConsentRoutes());
	app.route('/status', createStatusRoute());

	// Global error handler
	app.onError((err, c) => {
		const ctx = c.get('c15tContext');
		const log = ctx?.logger || logger;

		log.error('Request handling error:', err);

		if (err instanceof HTTPException) {
			const cause = err.cause as
				| { code?: string; [key: string]: unknown }
				| undefined;
			return c.json(
				{
					code: cause?.code || 'HTTP_ERROR',
					message: err.message,
					data: cause || {},
					status: err.status,
					defined: true,
				},
				err.status
			);
		}

		const message = err instanceof Error ? err.message : String(err);
		return c.json(
			{
				code: 'INTERNAL_SERVER_ERROR',
				message,
				status: 500,
				defined: true,
				data: {},
			},
			500
		);
	});

	// 404 handler
	app.notFound((c) => {
		return c.json(
			{
				code: 'NOT_FOUND',
				message: 'Not Found',
				status: 404,
				defined: true,
				data: {},
			},
			404
		);
	});

	// Create the handler function
	const handler = async (request: Request): Promise<Response> => {
		logger?.debug?.('Incoming request', {
			method: request.method,
			url: request.url,
		});

		// Strip the basePath from the URL if present
		// This allows Hono routes to be defined without the basePath prefix
		let modifiedRequest = request;
		if (basePath && basePath !== '/') {
			const url = new URL(request.url);
			const normalizedBasePath = basePath.replace(/\/$/, ''); // Remove trailing slash
			if (url.pathname.startsWith(normalizedBasePath)) {
				const newPath = url.pathname.slice(normalizedBasePath.length) || '/';
				url.pathname = newPath;
				modifiedRequest = new Request(url.toString(), {
					method: request.method,
					headers: request.headers,
					body: request.body,
					duplex: 'half',
				} as RequestInit);
			}
		}

		return app.fetch(modifiedRequest);
	};

	// Create docs UI helper
	const getDocsUI = () => {
		const specUrl = `${basePath}${openApiConfig.specPath}`.replace(/\/+/g, '/');
		return `
<!doctype html> 
<html>
  <head>
    <title>${options.appName || 'c15t API'} Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://c15t.com/icon.svg" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${encodeURI(specUrl)}">
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
`;
	};

	// Return the instance
	return {
		options,
		$context: context,
		app,
		handler,
		getOpenAPISpec: async () => {
			// Generate OpenAPI spec by fetching from our own endpoint
			const specResponse = await app.fetch(
				new Request(`http://localhost${openApiConfig.specPath}`)
			);
			return specResponse.json() as Promise<Record<string, unknown>>;
		},
		getDocsUI,
	};
};

export { defineConfig } from './define-config';
export type { C15TContext, C15TOptions } from './types';
export { version } from './version';
