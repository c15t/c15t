import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/types';

/**
 * Convert a c15t handler to a Next.js route handler.
 *
 * This adapter converts between standard Web API and c15t, letting c15t/H3 handle
 * all the HTTP logic including CORS. It doesn't depend on next/server.
 *
 * @example
 * ```typescript
 * import { toNextHandler } from '@c15t/backend/integrations';
 * import { c15t } from '@/c15t';
 * 
 * // app/api/c15t/[...paths]/route.ts
 * export const { GET, POST } = toNextHandler(c15t);
 * ```
 * 
 * @param instance - The c15t instance to adapt
 * @returns An object with Next.js route handler functions for each method
 */
export function toNextHandler(instance: C15TInstance) {
	// Create the base handler that processes requests
	const handleRequest = async (request: Request) => {
		try {
			const basePath: string = instance.options?.basePath as string || '/api/c15t';
			
			// Extract the path and rewrite for c15t routing
			const originalUrl = new URL(request.url);
			let pathWithoutBase = originalUrl.pathname;
			
			if (pathWithoutBase.startsWith(basePath)) {
				pathWithoutBase = pathWithoutBase.substring(basePath.length);
				// Ensure leading slash
				if (!pathWithoutBase.startsWith('/')) {
					pathWithoutBase = `/${pathWithoutBase}`;
				}
			}
			
			// Create rewritten request
			const rewrittenUrl = new URL(originalUrl.toString());
			rewrittenUrl.pathname = pathWithoutBase;
			
			const rewrittenRequest = new Request(rewrittenUrl.toString(), {
				method: request.method,
				headers: request.headers,
				body: request.body,
				// Preserve request properties
				credentials: 'include',
			});
			
			// Update baseURL for proper URL generation in responses
			await updateBaseUrl(request, basePath);
			
			// Let c15t handle the request
			const result = await instance.handler(rewrittenRequest);
			
			// Return the response directly - Next.js supports standard Response objects
			return await result.match(
				// Success case - just return the response
				(response) => response,
				// Error case - create an error response
				(error) => {
					const status = error.statusCode || 500;
					const message = error.message || ERROR_CODES.INTERNAL_SERVER_ERROR;
					
					return new Response(
						JSON.stringify({
							error: true,
							code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
							message,
							meta: error.meta,
						}),
						{
							status,
							headers: {
								'Content-Type': 'application/json',
							},
						}
					);
				}
			);
		} catch (error) {
			// Basic error handling
			return new Response(
				JSON.stringify({
					error: true,
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					message: 'An unexpected error occurred',
					meta: { error: String(error) },
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
		}
	};

	// Return an object with handler functions for each HTTP method
	return {
		GET: handleRequest,
		POST: handleRequest,
		PUT: handleRequest,
		DELETE: handleRequest,
		OPTIONS: handleRequest,
		HEAD: handleRequest,
		PATCH: handleRequest,
	};
	
	async function updateBaseUrl(
		request: Request, 
		basePath: string
	): Promise<void> {
		if (!instance.$context) { return; }
		
		try {
			const contextResult = await instance.$context;
			
			contextResult.match(
				(context: C15TContext) => {
					const url = new URL(request.url);
					const baseURL = `${url.protocol}//${url.host}${basePath}`;
					
					if (!context.baseURL || context.baseURL !== baseURL) {
						context.baseURL = baseURL;
						if (context.options) {
							context.options.baseURL = baseURL;
						}
					}
				},
				() => {} // Ignore errors
			);
		} catch {
			// Ignore errors
		}
	}
}

/**
 * Alternative Next.js route handler that works with any handler function.
 * 
 * This utility function helps create Next.js App Router route handlers
 * from any function that accepts a Request and returns a Response.
 *
 * @example
 * ```typescript
 * // Using with c15t
 * import { toNextJsHandler } from '@c15t/backend/integrations';
 * import { c15t } from '@/c15t';
 *
 * // app/api/auth/[...slug]/route.ts
 * export const { GET, POST } = toNextJsHandler(c15t);
 *
 * // Using with a custom handler
 * export const { GET } = toNextJsHandler((request) => {
 *   return new Response('Hello World');
 * });
 * ```
 * 
 * @param auth - Either a function or an object with a handler method
 * @returns An object with GET and POST methods for Next.js App Router
 */
export function toNextJsHandler(
	auth:
		| {
				handler: (request: Request) => Promise<Response>;
		  }
		| ((request: Request) => Promise<Response>),
) {
	const handler = async (request: Request) => {
		return "handler" in auth ? auth.handler(request) : auth(request);
	};
	return {
		GET: handler,
		POST: handler,
	};
}
