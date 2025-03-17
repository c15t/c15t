import type { HookEndpointContext } from '~/pkgs/types';
import type { DoubleTieMiddleware } from '../core/context';

/**
 * Hook definition for request/response processing in the API pipeline
 *
 * Hooks allow custom processing logic to be injected at various stages of
 * the request lifecycle. They can match specific requests, process request data
 * before endpoint handlers execute, and modify responses after endpoint execution.
 *
 * @typeParam ContextType - The context type being used (defaults to HookEndpointContext)
 *
 * @example
 * ```typescript
 * // Create a logging hook
 * const loggingHook: Hook = {
 *   // Match all API requests
 *   match: () => true,
 *
 *   // Log requests before processing
 *   before: async (context) => {
 *     console.log(`Request received: ${context.path}`);
 *     return { context: {} };
 *   },
 *
 *   // Log responses after processing
 *   after: async (context) => {
 *     console.log(`Response sent for: ${context.path}`);
 *     return {};
 *   }
 * };
 *
 * // Create a caching hook for GET requests
 * const cacheHook: Hook = {
 *   // Only match GET requests
 *   match: (context) => context.method === 'GET',
 *
 *   // Check cache before processing
 *   before: async (context) => {
 *     const cached = await cache.get(context.path);
 *     if (cached) {
 *       return cached; // Return cached response directly
 *     }
 *     return { context: {} }; // Continue normal processing
 *   },
 *
 *   // Store response in cache
 *   after: async (context) => {
 *     await cache.set(context.path, context.context.returned);
 *     return {};
 *   }
 * };
 * ```
 */
export interface Hook<ContextType = HookEndpointContext> {
	/**
	 * Optional matcher function to determine if hook should run
	 *
	 * This function evaluates the current request context to determine whether
	 * the hook's before/after handlers should be executed. If not provided,
	 * the hook will run for all requests.
	 *
	 * @param context - The endpoint context to evaluate
	 * @returns True if the hook should run, false otherwise
	 */
	match?: (context: ContextType) => boolean;

	/**
	 * Function to run before request processing
	 *
	 * This handler executes before the endpoint handler and can:
	 * - Modify the request context before it reaches the endpoint
	 * - Perform validation or authorization checks
	 * - Short-circuit processing by returning a response directly
	 * - Add data to the context for use by the endpoint
	 *
	 * @param context - The endpoint context
	 * @returns Hook result with modified context, or a direct response
	 */
	before?: DoubleTieMiddleware;

	/**
	 * Function to run after request processing
	 *
	 * This handler executes after the endpoint handler and can:
	 * - Modify the response before it's returned to the client
	 * - Add or modify response headers
	 * - Log response data
	 * - Perform cleanup operations
	 *
	 * @param context - The endpoint context including the response
	 * @returns Hook result with potentially modified response
	 */
	after?: DoubleTieMiddleware;
}
