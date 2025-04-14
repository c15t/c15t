import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';

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

			// Let c15t handle the request

			const result = await instance.handler(rewrittenRequest);

			// Convert c15t response to standard Response with CORS headers
			return await result.match(
				// Success case - add CORS headers and return
				(response) => {
					return addCorsHeaders(response, request, instance);
				},
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
		if (!origin) {
			return false;
		}

		// Get trusted origins from options
		const { trustedOrigins = [] } = instance.options || {};

		// Normalize trustedOrigins to array of strings
		let originsArray: string[] = [];

		if (Array.isArray(trustedOrigins)) {
			// Handle potential nested array from env vars: ["localhost"] becomes ["localhost"]
			originsArray = trustedOrigins.map((item) => {
				// If item is a string that looks like an array element (has quotes and brackets)
				if (
					typeof item === 'string' &&
					((item.startsWith('"') && item.endsWith('"')) ||
						(item.startsWith('[') && item.endsWith(']')))
				) {
					try {
						const parsed = JSON.parse(item);
						return typeof parsed === 'string' ? parsed : item;
					} catch {
						return item;
					}
				}
				return item;
			});
		} else if (typeof trustedOrigins === 'string') {
			// Try to parse as JSON if it looks like an array
			if (
				(trustedOrigins as string).startsWith('[') &&
				(trustedOrigins as string).endsWith(']')
			) {
				try {
					const parsed = JSON.parse(trustedOrigins as string);
					originsArray = Array.isArray(parsed) ? parsed : [trustedOrigins];
				} catch {
					originsArray = [trustedOrigins];
				}
			} else {
				originsArray = [trustedOrigins];
			}
		}

		// If wildcard is included, all origins are trusted
		if (originsArray.includes('*')) {
			return true;
		}

		// 1. Check exact match
		const isExactMatch = originsArray.includes(origin);
		if (isExactMatch) {
			return true;
		}

		// 2. Check domain-based matching
		try {
			const originUrl = new URL(origin);
			const originHostname = originUrl.hostname;

			// Check if any trusted origin is just the hostname (without protocol)
			if (originsArray.includes(originHostname)) {
				return true;
			}

			return false;
		} catch {
			return false;
		}
	}
}
