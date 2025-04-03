import {
	createApp,
	createRouter,
	eventHandler,
	handleCors,
	toWebHandler,
} from 'h3';
import { routes } from '~/routes';
import type { Endpoint } from '../types/endpoints';
import { withRequestSpan } from './telemetry';
import type { RouterProps } from './types';
import { isOriginTrusted } from './utils/cors';
import { getIp } from './utils/ip';

export { defineRoute } from './utils/define-route';

/**
 * Creates an API handler with proper context and CORS handling
 */
export function createApiHandler({ options, context }: RouterProps) {
	// Create an app instance
	const app = createApp({
		onRequest(event) {
			// Set up event context with required properties
			event.context.ipAddress = getIp(event.headers, options);
			event.context.userAgent = event.node.req.headers['user-agent'] || null;
			event.context.registry = context.registry;
			event.context.adapter = context.adapter;
			event.context.trustedOrigins = context.trustedOrigins;
		},
	});

	// Create CORS handler using h3's built-in handleCors
	app.use(
		eventHandler((event) => {
			// Return true if it's a CORS preflight that has been handled
			return handleCors(event, {
				origin: (origin: string) =>
					isOriginTrusted(origin, event.context.trustedOrigins),
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
				allowHeaders: ['Content-Type', 'Authorization'],
				credentials: true,
				maxAge: '600',
			});
		})
	);

	// Create a new router and register it with the app
	const router = createRouter();
	app.use(router);

	// Initialize routes with tracing
	for (const route of routes) {
		// Check if it's an endpoint or a route with method
		if ('path' in route && 'handler' in route) {
			const path = route.path;
			const handler = route.handler;

			// Handle method-specific routes differently than endpoints
			if ('method' in route) {
				// This is a Route object with method
				router[route.method](
					path,
					eventHandler(async (event) => {
						// Run handler with tracing
						return withRequestSpan(
							event.method.toUpperCase(),
							path,
							() => handler(event),
							options
						);
					})
				);
			} else {
				// This is an Endpoint object - safely cast to Endpoint type
				const endpoint = route as unknown as Endpoint;

				router.use(
					path,
					eventHandler(async (event) => {
						// Run middleware if defined - safely check for options and middleware
						if (
							endpoint.options &&
							Array.isArray(endpoint.options.middleware)
						) {
							for (const middleware of endpoint.options.middleware) {
								await middleware(event);
							}
						}

						// Run handler with tracing
						return withRequestSpan(
							event.method.toUpperCase(),
							path,
							() => handler(event),
							options
						);
					})
				);
			}
		}
	}

	// Convert to web handler
	const handler = toWebHandler(app);

	return { handler };
}
