import {
	createApp,
	createRouter,
	eventHandler,
	handleCors,
	toWebHandler,
} from 'h3';
import { routes } from '~/routes';
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
			if (
				handleCors(event, {
					origin: (origin: string) =>
						isOriginTrusted(origin, event.context.trustedOrigins),
					methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
					allowHeaders: ['Content-Type', 'Authorization'],
					credentials: true,
					maxAge: '600',
				})
			) {
				return;
			}
		})
	);

	// Create a new router and register it with the app
	const router = createRouter();
	app.use(router);

	// Initialize routes with tracing
	for (const route of routes) {
		router[route.method](
			route.path,
			eventHandler(async (event) => {
				return withRequestSpan(
					event.method.toUpperCase(),
					route.path,
					() => route.handler(event),
					options
				);
			})
		);
	}

	// Convert to web handler
	const handler = toWebHandler(app);

	return { handler };
}
