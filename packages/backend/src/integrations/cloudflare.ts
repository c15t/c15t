import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/types';

/**
 * Convert a c15t handler to a Cloudflare Worker handler.
 *
 * This adapter is specifically designed for Cloudflare Workers environments,
 * avoiding Node.js-specific dependencies and APIs.
 *
 * @example
 * ```typescript
 * import { toCloudflareHandler } from '@c15t/backend/integrations';
 * import { c15tInstance } from '@c15t/backend';
 *
 * // Create c15t instance
 * const c15t = c15tInstance({
 *   basePath: '/',
 *   cors: true,
 *   // other options...
 * });
 *
 * // Export the worker handler
 * export default {
 *   async fetch(request, env, ctx) {
 *     return await toCloudflareHandler(c15t)(request);
 *   }
 * };
 * ```
 *
 * @param instance - The c15t instance to adapt
 * @returns A handler function suitable for Cloudflare Workers
 */
export function toCloudflareHandler(instance: C15TInstance) {
	return async (request: Request): Promise<Response> => {
		try {
			const basePath: string =
				(instance.options?.basePath as string) || '/api/c15t';

			// Extract the path and rewrite for c15t routing
			const originalUrl = new URL(request.url);
			let pathWithoutBase = originalUrl.pathname;

			// Handle CORS preflight requests directly
			if (request.method === 'OPTIONS') {
				return handleCorsPreflightRequest(request, instance);
			}

			if (pathWithoutBase.startsWith(basePath)) {
				pathWithoutBase = pathWithoutBase.substring(basePath.length);
				// Ensure leading slash
				if (!pathWithoutBase.startsWith('/')) {
					pathWithoutBase = `/${pathWithoutBase}`;
				}
			}

			// Create rewritten request with careful cloning to avoid stream issues
			const rewrittenUrl = new URL(originalUrl.toString());
			rewrittenUrl.pathname = pathWithoutBase;

			const headers = new Headers();
			for (const [key, value] of request.headers.entries()) {
				headers.set(key, value);
			}

			// Create a new request without the credentials field which is not supported in Cloudflare Workers
			const rewrittenRequest = new Request(rewrittenUrl.toString(), {
				method: request.method,
				headers,
				body: ['GET', 'HEAD'].includes(request.method)
					? undefined
					: request.body,
			});

			// Update baseURL for proper URL generation in responses
			await updateBaseUrl(request, basePath);

			// Let c15t handle the request
			const result = await instance.handler(rewrittenRequest);

			// Convert c15t response to standard Response with CORS headers
			return await result.match(
				// Success case - add CORS headers and return
				(response) => addCorsHeaders(response, request, instance),
				// Error case - create an error response with CORS headers
				(error) => {
					const status = error.statusCode || 500;
					const message = error.message || ERROR_CODES.INTERNAL_SERVER_ERROR;

					const errorResponse = new Response(
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

					return addCorsHeaders(errorResponse, request, instance);
				}
			);
		} catch (error) {
			// Basic error handling
			const errorResponse = new Response(
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

			return addCorsHeaders(errorResponse, request, instance);
		}
	};

	/**
	 * Handle CORS preflight requests directly
	 */
	function handleCorsPreflightRequest(
		request: Request,
		instance: C15TInstance
	): Response {
		const origin = request.headers.get('Origin');
		const isTrusted = isTrustedOrigin(origin, instance);

		const headers = new Headers({
			'Access-Control-Allow-Origin': isTrusted && origin ? origin : '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers':
				'Content-Type, Authorization, x-request-id',
			'Access-Control-Max-Age': '86400',
		});

		// Add credentials header if trusted origin
		if (isTrusted) {
			headers.set('Access-Control-Allow-Credentials', 'true');
		}

		return new Response(null, {
			status: 204,
			headers,
		});
	}

	/**
	 * Add CORS headers to a response
	 */
	function addCorsHeaders(
		response: Response,
		request: Request,
		instance: C15TInstance
	): Response {
		const origin = request.headers.get('Origin');
		const isTrusted = isTrustedOrigin(origin, instance);

		const newResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});

		// Set CORS headers
		newResponse.headers.set(
			'Access-Control-Allow-Origin',
			isTrusted && origin ? origin : '*'
		);

		// Add credentials header if trusted origin
		if (isTrusted) {
			newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
		}

		return newResponse;
	}

	/**
	 * Check if origin is trusted
	 */
	function isTrustedOrigin(
		origin: string | null,
		instance: C15TInstance
	): boolean {
		if (!origin) return false;

		// If no trusted origins are defined, none are trusted
		const { trustedOrigins = [] } = instance.options || {};

		// If wildcard is included, all origins are trusted
		if (trustedOrigins.includes('*')) return true;

		// Check if origin is in trusted list
		return trustedOrigins.includes(origin);
	}

	/**
	 * Update baseUrl in c15t context
	 */
	async function updateBaseUrl(
		request: Request,
		basePath: string
	): Promise<void> {
		if (!instance.$context) return;

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
