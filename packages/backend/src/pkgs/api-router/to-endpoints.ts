import {
	APIError,
	type EndpointContext,
	type EndpointOptions,
	type InputContext,
	toResponse,
} from 'better-call';
import defu from 'defu';
import type { C15TContext, HookEndpointContext } from '~/pkgs/types';
import type { C15TEndpoint, C15TMiddleware } from './call';

/**
 * Hook definition for request/response processing
 */
interface Hook {
	/**
	 * Optional matcher function to determine if hook should run
	 */
	match?: (context: HookEndpointContext) => boolean;

	/**
	 * Function to run before request processing
	 */
	before?: C15TMiddleware;

	/**
	 * Function to run after request processing
	 */
	after?: C15TMiddleware;
}

/**
 * Internal context type combining endpoint and input contexts with C15T-specific properties
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
 * @param ctx - The C15T context or promise that will resolve to context
 * @returns A record of API functions matching the endpoint definitions
 * @throws Will re-throw any errors not instanceof APIError that occur during endpoint execution
 *
 * @example
 * ```typescript
 * const api = toEndpoints({
 *   getSubject: createAuthEndpoint(async (ctx) => {
 *     return { name: "Subject" };
 *   }),
 *   updateSubject: createAuthEndpoint(async (ctx) => {
 *     // Process update logic
 *   })
 * }, contextPromise);
 *
 * // Later use the API
 * const subject = await api.getSubject({ params: { id: "sub_x1pftyoufsm7xgo1kv" } });
 * ```
 */
export function toEndpoints<EndpointMap extends Record<string, C15TEndpoint>>(
	endpoints: EndpointMap,
	ctx: C15TContext | Promise<C15TContext>
) {
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
			const C15TContext = await ctx;
			let internalContext: InternalContext = {
				...context,
				context: {
					...C15TContext,
					returned: undefined,
					responseHeaders: undefined,
					session: null,
				},
				path: endpoint.path,
				headers: context?.headers ? new Headers(context?.headers) : undefined,
			};
			const { beforeHooks, afterHooks } = getHooks(C15TContext);
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
				 * const cacheHook: C15TMiddleware = async (ctx) => {
				 *   const cached = await cache.get(ctx.path);
				 *   if (cached) return { data: cached }; // Short-circuits
				 *   return { context: {} }; // Continues processing
				 * };
				 *
				 * // Hook that blocks unauthorized requests
				 * const authHook: C15TMiddleware = async (ctx) => {
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
		api[key].options = endpoint.options;
	}
	return api as EndpointMap;
}

/**
 * Executes before hooks on the request context
 *
 * Runs through all matching hooks in sequence, accumulating and applying
 * context modifications.
 *
 * @internal
 * @param context - The endpoint context to pass to hooks
 * @param hooks - Array of hook definitions with matchers and handlers
 * @returns Modified context or hook response
 * @throws Will propagate any errors thrown by hook handlers that aren't caught internally
 */
async function runBeforeHooks(
	context: HookEndpointContext,
	hooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: C15TMiddleware;
	}[]
) {
	let modifiedContext: {
		headers?: Headers;
	} = {};
	for (const hook of hooks) {
		if (hook.matcher(context)) {
			const result = await hook.handler({
				...context,
				returnHeaders: false,
			});
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
 * @internal
 * @param context - The endpoint context to pass to hooks
 * @param hooks - Array of hook definitions with matchers and handlers
 * @returns An object potentially containing a modified response
 * @throws Will propagate any errors thrown by hook handlers that aren't caught internally
 */
async function runAfterHooks(
	context: HookEndpointContext,
	hooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: C15TMiddleware;
	}[]
) {
	let headers: Headers | null = null;
	let response: unknown = null;
	for (const hook of hooks) {
		if (hook.matcher(context)) {
			const result = await hook.handler({
				...context,
				returnHeaders: true,
			});
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

/**
 * Extracts hook definitions from the C15T context
 *
 * Organizes hooks into before and after categories for processing.
 *
 * @internal
 * @param context - The C15T context containing hook definitions
 * @returns Object with before and after hook arrays
 */
function getHooks(context: C15TContext) {
	const hooks = (context.hooks || []) as Hook[];
	const beforeHooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: C15TMiddleware;
	}[] = [];
	const afterHooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: C15TMiddleware;
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
