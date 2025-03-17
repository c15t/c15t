import {
	APIError,
	type EndpointContext,
	type EndpointOptions,
	type InputContext,
	toResponse,
} from 'better-call';
import defu from 'defu';
import type { C15TContext, HookEndpointContext } from '~/pkgs/types';
import type { DoubleTieEndpoint } from '../core/endpoint';
import { runAfterHooks, runBeforeHooks } from '../hooks/processor';
import type { Hook } from '../hooks/types';

/**
 * Internal context type combining endpoint and input contexts with DoubleTie-specific properties
 *
 * @internal
 */
type InternalContext = InputContext<string, EndpointOptions> &
	EndpointContext<string, EndpointOptions, unknown> & {
		asResponse?: boolean;
		context: C15TContext & {
			returned?: unknown;
			responseHeaders?: Headers;
		};
	};

/**
 * Extracts hook definitions from the DoubleTie context
 *
 * Organizes hooks into before and after categories for processing.
 *
 * @internal
 * @param context - The DoubleTie context containing hook definitions
 * @returns Object with before and after hook arrays
 */
function getHooks(context: C15TContext) {
	const hooks = (context.hooks || []) as Hook[];
	const beforeHooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: any;
	}[] = [];
	const afterHooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: any;
	}[] = [];

	for (const hook of hooks) {
		if (typeof hook.before === 'function') {
			beforeHooks.push({
				matcher: hook.match || (() => true),
				handler: hook.before,
			});
		}
		if (typeof hook.after === 'function') {
			afterHooks.push({
				matcher: hook.match || (() => true),
				handler: hook.after,
			});
		}
	}

	return {
		beforeHooks,
		afterHooks,
	};
}

/**
 * Converts a map of endpoint definitions to callable API functions
 *
 * This function transforms raw endpoint definitions into API handlers that
 * properly manage context, execute hooks, and handle responses.
 *
 * @remarks
 * The generated API handlers maintain the path and options from the original
 * endpoints while adding hook processing, error handling, and response formatting.
 *
 * @typeParam EndpointMap - Record type mapping endpoint names to their handler functions
 * @param endpoints - Map of endpoint definitions to convert
 * @param ctx - The DoubleTie context or promise that will resolve to context
 * @returns A record of API functions matching the endpoint definitions
 * @throws Will re-throw any errors not instanceof APIError that occur during endpoint execution
 *
 * @example
 * ```typescript
 * const api = toEndpoints({
 *   getUser: createSDKEndpoint(async (ctx) => {
 *     return { name: "John Doe" };
 *   }),
 *   updateUser: createSDKEndpoint(async (ctx) => {
 *     // Process update logic
 *   })
 * }, contextPromise);
 *
 * // Later use the API
 * const user = await api.getUser({ params: { id: "user_123" } });
 * ```
 */
export function toEndpoints<
	EndpointMap extends Record<string, DoubleTieEndpoint>,
>(endpoints: EndpointMap, ctx: C15TContext | Promise<C15TContext>) {
	const api: Record<
		string,
		((
			context: EndpointContext<string, EndpointOptions, unknown> &
				InputContext<string, EndpointOptions>
		) => Promise<unknown>) & {
			path?: string;
			options?: EndpointOptions;
		}
	> = {};

	for (const [key, endpoint] of Object.entries(endpoints)) {
		api[key] = async (context) => {
			const appContext = await ctx;
			let internalContext: InternalContext = {
				...context,
				context: {
					...appContext,
					returned: undefined,
					responseHeaders: undefined,
					session: null,
				},
				path: endpoint.path || '',
				headers: context?.headers ? new Headers(context?.headers) : undefined,
			};
			const { beforeHooks, afterHooks } = getHooks(appContext);
			const before = await runBeforeHooks(internalContext, beforeHooks);
			/**
			 * If `before.context` is returned, it should
			 * get merged with the original context
			 */
			if (
				'context' in before &&
				before.context &&
				typeof before.context === 'object'
			) {
				const { headers, ...rest } = before.context as {
					headers: Headers;
				};
				/**
				 * Headers should be merged differently
				 * so the hook doesn't override the whole
				 * header
				 */
				if (headers) {
					headers.forEach((value, key) => {
						(internalContext.headers as Headers).set(key, value);
					});
				}
				internalContext = defu(rest, internalContext);
			} else if (before) {
				/**
				 * Short-circuit behavior:
				 * If a before hook returns anything other than a context object,
				 * that value is immediately returned and all subsequent processing
				 * (remaining hooks and endpoint execution) is bypassed.
				 *
				 * This allows hooks to:
				 * - Return early with a cached response
				 * - Block requests by returning an error
				 * - Transform the request flow entirely
				 *
				 * @example
				 * ```typescript
				 * // Hook that returns early with cached data
				 * const cacheHook: DoubleTieMiddleware = async (ctx) => {
				 *   const cached = await cache.get(ctx.path);
				 *   if (cached) return { data: cached }; // Short-circuits
				 *   return { context: {} }; // Continues processing
				 * };
				 *
				 * // Hook that blocks unauthorized requests
				 * const authHook: DoubleTieMiddleware = async (ctx) => {
				 *   if (!ctx.headers.get('Authorization')) {
				 *     return new APIError('UNAUTHORIZED', 'Missing auth token');
				 *   }
				 *   return { context: {} };
				 * };
				 * ```
				 */
				return before;
			}

			internalContext.asResponse = false;
			internalContext.returnHeaders = true;
			const result = (await endpoint(internalContext).catch((e) => {
				if (e instanceof APIError) {
					/**
					 * API Errors from response are caught
					 * and returned to hooks
					 */
					return {
						response: e,
						headers: e.headers ? new Headers(e.headers) : null,
					};
				}
				throw e;
			})) as {
				headers: Headers;
				response: unknown;
			};
			internalContext.context.returned = result.response;
			internalContext.context.responseHeaders = result.headers;

			const after = await runAfterHooks(internalContext, afterHooks);

			if (after.response) {
				result.response = after.response;
			}

			if (result.response instanceof APIError && !context?.asResponse) {
				throw result.response;
			}

			let response: unknown;

			if (context?.asResponse) {
				response = toResponse(result.response, {
					headers: result.headers,
				});
			} else if (context?.returnHeaders) {
				response = {
					headers: result.headers,
					response: result.response,
				};
			} else {
				response = result.response;
			}

			return response;
		};
		api[key].path = endpoint.path;
		api[key].options = endpoint.options as EndpointOptions;
	}
	return api as EndpointMap;
}
