import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/types';

/**
 * Convert a c15t handler to a pure Node.js/Cloudflare Worker handler.
 *
 * This adapter converts between Web API Request/Response objects and c15t,
 * letting c15t/H3 handle all the HTTP logic including CORS.
 *
 * @example
 * ```typescript
 * // Node.js with standard Request/Response objects
 * import { toNodeHandler } from '@c15t/backend/integrations/node';
 * import { c15t } from './c15t';
 *
 * // Create the request handler
 * const handler = toNodeHandler(c15t);
 *
 * // Example for Cloudflare Worker
 * export default {
 *   async fetch(request, env, ctx) {
 *     return await handler(request);
 *   }
 * };
 * ```
 *
 * @param instance - The c15t instance to adapt
 * @returns A handler function that takes a Request and returns a Response
 */
export function toNodeHandler(instance: C15TInstance) {
	return async (request: Request): Promise<Response> => {
		try {
			const basePath: string =
				(instance.options?.basePath as string) || '/api/c15t';

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

			// Convert c15t response to standard Response
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

	async function updateBaseUrl(
		request: Request,
		basePath: string
	): Promise<void> {
		if (!instance.$context) {
			return;
		}

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
