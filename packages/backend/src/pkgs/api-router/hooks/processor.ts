import defu from 'defu';
import type { HookEndpointContext } from '~/pkgs/types';
import type { DoubleTieMiddleware } from '~/pkgs/types/options';

/**
 * Executes before hooks on the request context
 *
 * Runs through all matching hooks in sequence, accumulating and applying
 * context modifications.
 *
 * @param context - The endpoint context to pass to hooks
 * @param hooks - Array of hook definitions with matchers and handlers
 * @returns Modified context or hook response
 * @throws Will propagate any errors thrown by hook handlers that aren't caught internally
 *
 * @example
 * ```typescript
 * // Process before hooks for a request
 * const beforeResult = await runBeforeHooks(context, [
 *   {
 *     matcher: ctx => ctx.path.startsWith('/users'),
 *     handler: authMiddleware
 *   },
 *   {
 *     matcher: ctx => ctx.method === 'GET',
 *     handler: cacheMiddleware
 *   }
 * ]);
 *
 * // Check if we should continue with normal processing
 * if ('context' in beforeResult) {
 *   // Apply context modifications and continue
 *   Object.assign(context, beforeResult.context);
 * } else {
 *   // Short-circuit with the hook response
 *   return beforeResult;
 * }
 * ```
 */
export async function runBeforeHooks(
	context: HookEndpointContext,
	hooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: DoubleTieMiddleware;
	}[]
) {
	let modifiedContext: {
		headers?: Headers;
	} = {};
	for (const hook of hooks) {
		if (hook.matcher(context)) {
			const result = await hook.handler(context, async () => Promise.resolve());
			if (result && typeof result === 'object') {
				if ('context' in result && typeof result.context === 'object') {
					const { headers, ...rest } = result.context as {
						headers: Headers;
					};
					if (headers instanceof Headers) {
						if (modifiedContext.headers) {
							headers.forEach((value, key) => {
								modifiedContext.headers?.set(key, value);
							});
						} else {
							modifiedContext.headers = headers;
						}
					}
					modifiedContext = defu(rest, modifiedContext);
					continue;
				}
				return result;
			}
		}
	}
	return { context: modifiedContext };
}

/**
 * Executes after hooks on the response context
 *
 * Runs through all matching hooks in sequence after the endpoint handler has completed,
 * allowing post-processing of responses.
 *
 * @param context - The endpoint context to pass to hooks
 * @param hooks - Array of hook definitions with matchers and handlers
 * @returns An object potentially containing a modified response
 * @throws Will propagate any errors thrown by hook handlers that aren't caught internally
 *
 * @example
 * ```typescript
 * // Process after hooks for a response
 * const afterResult = await runAfterHooks(context, [
 *   {
 *     matcher: ctx => true, // Run for all responses
 *     handler: loggingMiddleware
 *   },
 *   {
 *     matcher: ctx => ctx.method === 'GET',
 *     handler: cachingMiddleware
 *   }
 * ]);
 *
 * // Apply any response modifications from hooks
 * if (afterResult.response) {
 *   response = afterResult.response;
 * }
 *
 * // Apply any header modifications from hooks
 * if (afterResult.headers) {
 *   afterResult.headers.forEach((value, key) => {
 *     responseHeaders.set(key, value);
 *   });
 * }
 * ```
 */
export async function runAfterHooks(
	context: HookEndpointContext,
	hooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: DoubleTieMiddleware;
	}[]
) {
	let headers: Headers | null = null;
	let response: unknown = null;
	for (const hook of hooks) {
		if (hook.matcher(context)) {
			const result = await hook.handler(context, async () => Promise.resolve());
			if (
				result &&
				typeof result === 'object' &&
				'response' in result &&
				result.response !== undefined
			) {
				response = result.response;
			}
			if (
				result &&
				typeof result === 'object' &&
				'headers' in result &&
				result.headers
			) {
				if (!headers) {
					headers = new Headers();
				}
				(result.headers as Headers).forEach((value, key) => {
					headers?.set(key, value);
				});
			}
		}
	}
	return { response, headers };
}
