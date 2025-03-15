import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/pkgs/types';

/**
 * Convert a c15t handler to a Next.js API route handler.
 *
 * This function adapts a c15t instance to work with Next.js App Router API routes,
 * providing GET and POST handler functions. It handles the conversion between
 * c15t's Result types and Next.js Response objects.
 *
 * @example
 * ```typescript
 * // app/api/c15t/route.ts
 * import { toNextJsHandler } from '@c15t/integrations/next';
 * import { c15t } from '@/lib/c15t';
 *
 * // Pass the entire c15t instance, not just the handler
 * export const { GET, POST } = toNextJsHandler(c15t);
 *
 * // ❌ Don't do this:
 * // export const { GET, POST } = toNextJsHandler(c15t.handler);
 * ```
 *
 * @param instance - The complete c15t instance (not just the handler)
 * @returns Next.js API route handler functions for GET and POST
 */
export function toNextJsHandler(instance: C15TInstance) {
	const handler = async (initialRequest: Request) => {
		try {
			const request = initialRequest;

			// For POST requests, validate JSON body
			if (request.method === 'POST') {
				try {
					const clonedRequest = request.clone();
					await clonedRequest.json();
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: true,
							code: ERROR_CODES.REQUEST_HANDLER_ERROR,
							message: 'Invalid JSON in request body',
							details: error instanceof Error ? error.message : 'Unknown error',
						}),
						{
							status: 400,
							headers: {
								'Content-Type': 'application/json',
							},
						}
					);
				}
			}

			// Ensure the baseURL is set correctly for the c15t instance
			if (instance.$context) {
				const contextPromise = instance.$context;
				try {
					const contextResult = await contextPromise;

					// Extract context safely using match pattern
					contextResult.match(
						(context: C15TContext) => {
							// If baseURL is not set, initialize it from the request URL
							if (!context.baseURL || context.baseURL.trim() === '') {
								const url = new URL(request.url);
								const basePath = context.options?.basePath || '/api/c15t';
								const baseURL = `${url.origin}${basePath}`;

								context.baseURL = baseURL;
								if (context.options) {
									context.options.baseURL = baseURL;
								}
							}
						},
						() => {
							// Handle context error silently - the handler will deal with it
						}
					);
				} catch {
					// Handle promise rejection silently - the handler will deal with it
				}
			}

			// Handle the request and unwrap the Result
			const result = await instance.handler(request);
			return await result.match(
				(response) => response,
				(error) => {
					// Convert c15t errors to Response objects
					const status = error.status || 500;
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
			// Handle any unexpected errors
			// biome-ignore lint/suspicious/noConsole: This is a logging error
			console.error('Unexpected error in c15t handler:', error);
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

	return {
		GET: handler,
		POST: handler,
	};
}
