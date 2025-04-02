import {
	type H3Event,
	createApp,
	createRouter,
	defineEventHandler,
	handleCors,
	toWebHandler,
} from 'h3';
import { routes } from '~/routes';
import type { RouterProps } from './types';
import { getIp } from './utils/ip';

export { defineRoute } from './utils/define-route';

export function createApiHandler({ options, context }: RouterProps) {
	// Create an app instance
	const app = createApp({
		onRequest(event) {
			event.context.ipAddress = getIp(event.headers, options);
			event.context.userAgent = event.node.req.headers['user-agent'] || null;
			event.context.registry = context.registry;
			event.context.adapter = context.adapter;
		},
	});

	// Create CORS handler
	const corsHandler = defineEventHandler((event: H3Event) => {
		if (
			handleCors(event, {
				origin: '*',
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
				allowHeaders: ['Content-Type', 'Authorization'],
			})
		) {
			return;
		}
	});

	// Add CORS handler before router
	app.use(corsHandler);

	// Create a new router and register it in app
	const router = createRouter();
	app.use(router);

	// Initialize routes
	for (const route of routes) {
		router[route.method](route.path, route.handler);
	}

	const handler = toWebHandler(app);

	return { handler };
}
