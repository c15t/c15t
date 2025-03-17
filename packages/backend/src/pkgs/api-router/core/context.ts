import { createMiddleware } from 'better-call';
import type { C15TContext } from '~/pkgs/types';

/**
 * Middleware that provides access to the C15T context
 *
 * This middleware is used as a base for all endpoint handlers to provide
 * access to the C15T context.
 *
 * @returns A Promise resolving to the C15T context
 * @internal This is primarily meant for internal use by the DoubleTie system
 *
 * @remarks
 * This middleware serves as the foundation for context propagation throughout
 * the API system. It's typically not used directly but is
 * composed within other middleware and endpoint factories.
 *
 * @example
 * ```typescript
 * // This middleware is typically used internally by createSDKMiddleware and createSDKEndpoint
 * const myMiddleware = createMiddleware.create({
 *   use: [optionsMiddleware]
 * });
 * ```
 */
export const optionsMiddleware = createMiddleware(async () => {
	/**
	 * This will be passed on the instance of
	 * the context. Used to infer the type
	 * here.
	 * @internal
	 */
	return {} as C15TContext;
});

/**
 * Creates a middleware with pre-configured context access
 *
 * This factory combines the options middleware with post-hook functionality,
 * allowing handlers to modify responses by setting headers.
 *
 * @returns A configured middleware for API endpoints
 * @throws May propagate errors from underlying middleware implementations
 * @throws Errors from your middleware handler will be propagated unless explicitly caught
 *
 * @remarks
 * The middleware created by this factory automatically receives the DoubleTie context
 * and manages response header manipulation. It's particularly useful for
 * authentication, authorization, and other cross-cutting concerns.
 *
 * @example
 * ```typescript
 * // Create a custom authentication middleware
 * const verifyUserMiddleware = createSDKMiddleware(async (context) => {
 *   const { userId } = context.params;
 *
 *   // Verify the user exists
 *   const user = await getUserById(userId);
 *   if (!user) {
 *     throw new APIError({
 *       message: 'User not found',
 *       status: 'NOT_FOUND'
 *     });
 *   }
 *
 *   // Add user to context
 *   return {
 *     context: {
 *       user
 *     }
 *   };
 * });
 *
 * // Apply the middleware to specific routes in router configuration
 * router.use('/users/**', verifyUserMiddleware);
 * ```
 */
export const createSDKMiddleware = createMiddleware.create({
	use: [
		optionsMiddleware,
		/**
		 * Only use for post hooks
		 * @internal
		 */
		createMiddleware(async () => {
			return {} as {
				returned?: unknown;
				responseHeaders?: Headers;
			};
		}),
	],
});

/**
 * Type definition for a DoubleTie middleware handler
 *
 * Represents the function signature returned by createSDKMiddleware.
 * Used for type checking when building middleware chains.
 *
 * @typeParam ContextExtension - Additional context properties added by this middleware
 *
 * @remarks
 * This type is used when defining hooks and custom middleware
 * for the request pipeline.
 */
export type DoubleTieMiddleware = ReturnType<typeof createSDKMiddleware>; 