/**
 * The TanStack Router plugin generates these route types in an app's
 * `src/routeTree.gen.ts`. These snippets are never built, so they declare
 * the server routes by hand.
 */
import type { Route as rootRoute } from './rendering/streamed-root';
import type { Route as consentRoute } from './routes/api/c15t/$';
import type { Route as selfHostRoute } from './routes/api/self-host/$';

declare module '@tanstack/react-router' {
	interface FileRoutesByPath {
		'/api/c15t/$': {
			id: '/api/c15t/$';
			path: '/api/c15t/$';
			fullPath: '/api/c15t/$';
			preLoaderRoute: typeof consentRoute;
			parentRoute: typeof rootRoute;
		};
		'/api/self-host/$': {
			id: '/api/self-host/$';
			path: '/api/self-host/$';
			fullPath: '/api/self-host/$';
			preLoaderRoute: typeof selfHostRoute;
			parentRoute: typeof rootRoute;
		};
	}
}
