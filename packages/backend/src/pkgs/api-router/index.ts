import {
	createApp,
	createRouter,
	eventHandler,
	handleCors,
	sendStream,
	toWebHandler,
} from 'h3';
import { routes } from '~/routes';
import { withRequestSpan } from './telemetry';
import type { RouterProps } from './types';
import { isOriginTrusted } from './utils/cors';

import type { Readable } from 'node:stream';
import { getIp } from './utils/ip';

import { createH3ErrorHandler, withH3ErrorHandling } from '../results';
export { defineRoute } from './utils/define-route';

/**
 * Creates an API handler with proper context and CORS handling
 */
export function createApiHandler({ options, context }: RouterProps) {
	// Use the logger from context instead of creating a new one
	const { logger } = context;
	logger.info('Creating API Handler');

	// Create an app instance
	const app = createApp({
		onRequest(event) {
			// Set up event context with required properties
			event.context.ipAddress = getIp(event.headers, options);
			event.context.userAgent = event.node.req.headers['user-agent'] || null;
			event.context.registry = context.registry;
			event.context.adapter = context.adapter;
			event.context.trustedOrigins = context.trustedOrigins;
			event.context.logger = logger; // Make the logger available in the event context
			logger.debug(`Request received: ${event.method} ${event.path}`);
		},
		onError(error, event) {
			// Use our custom error handler if available
			if (
				event.context._onError &&
				typeof event.context._onError === 'function'
			) {
				return event.context._onError(error);
			}

			// Default error handling as fallback
			logger.error(`Unhandled API error in ${event.method} ${event.path}`, {
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});
		},
	});

	// Add error handler middleware first
	app.use(createH3ErrorHandler());
	logger.debug('Added error handler middleware');

	// Create CORS handler using h3's built-in handleCors
	app.use(
		eventHandler((event) => {
			const origin = event.headers.get('origin');
			logger.debug(`Processing CORS for: ${event.method} ${event.path}`, {
				origin,
				trustedOrigins: event.context.trustedOrigins,
			});

			// Check if the origin is trusted
			const isTrusted = origin
				? isOriginTrusted(origin, event.context.trustedOrigins)
				: false;

			logger.debug(
				`Origin trust check: ${origin} -> ${isTrusted ? 'trusted' : 'not trusted'}`
			);

			if (
				handleCors(event, {
					origin: (originStr: string) => {
						const originResult = isOriginTrusted(
							originStr,
							event.context.trustedOrigins
						);
						logger.debug(
							`CORS check for origin: ${originStr} -> ${originResult ? 'allowed' : 'blocked'}`
						);
						return originResult;
					},
					methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
					allowHeaders: ['Content-Type', 'Authorization'],
					credentials: true,
					maxAge: '600',
				})
			) {
				logger.debug('CORS preflight response sent');
				return;
			}
		})
	);

	// Create a new router and register it with the app
	const router = createRouter();
	app.use(router);
	logger.debug('Router initialized and registered with app');

	// Initialize routes with tracing
	for (const route of routes) {
		logger.debug(`Registering route: ${route.method} ${route.path}`);
		router[route.method](
			route.path,
			// Wrap with our error handling middleware
			withH3ErrorHandling(
				eventHandler(async (event) => {
					logger.debug(`Handling request: ${route.method} ${route.path}`);
					try {
						// Execute the handler with tracing
						logger.debug(`Executing handler for ${route.path}`);
						const result = await withRequestSpan(
							event.method.toUpperCase(),
							route.path,
							() => route.handler(event),
							options
						);

						logger.debug(`Handler completed for ${route.path}`);

						// Set proper content type header based on response type
						if (
							typeof result === 'object' &&
							result !== null &&
							'pipe' in result &&
							typeof result.pipe === 'function'
						) {
							// For streams, use appropriate stream handling
							logger.debug(`Sending stream response for ${route.path}`);
							return sendStream(event, result as Readable);
						}

						// For all other responses, use JSON
						event.node.res.setHeader('Content-Type', 'application/json');

						// Let H3 handle the serialization natively
						// The defineRoute handler already ensures proper object wrapping
						return result;
					} catch (error) {
						logger.error(`Error in route handler for ${route.path}`, {
							error: error instanceof Error ? error.message : String(error),
							errorType:
								error instanceof Error ? error.constructor.name : typeof error,
						});
						throw error; // Let error handler middleware handle it
					}
				})
			)
		);
	}

	// Convert to web handler
	const handler = toWebHandler(app);
	logger.info('API handler created successfully');

	return { handler };
}
