import { createEndpoint, createMiddleware } from 'better-call';
import type { C15TContext } from '~/types';

/**
 * Middleware that provides access to the C15T context
 *
 * This middleware is used as a base for all endpoint handlers to provide
 * access to the C15T context.
 *
 * @returns A Promise resolving to the C15T context
 * @internal This is primarily meant for internal use by the C15T system
 *
 * @remarks
 * This middleware serves as the foundation for context propagation throughout
 * the consent management system. It's typically not used directly but is
 * composed within other middleware and endpoint factories.
 *
 * @example
 * ```typescript
 * // This middleware is typically used internally by createAuthMiddleware and createAuthEndpoint
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
 * Creates an authentication middleware with pre-configured context access
 *
 * This factory combines the options middleware with post-hook functionality,
 * allowing handlers to modify responses by setting headers.
 *
 * @returns A configured middleware for authentication endpoints
 * @throws May propagate errors from underlying middleware implementations
 * @throws Errors from your middleware handler will be propagated unless explicitly caught
 *
 * @remarks
 * The middleware created by this factory automatically receives the C15T context
 * and manages response header manipulation. It's particularly useful for
 * authentication, authorization, and other cross-cutting concerns.
 *
 * @example
 * ```typescript
 * // Create a custom authentication middleware
 * const verifySubjectMiddleware = createAuthMiddleware(async (context) => {
 *   const { subjectId } = context.params;
 *
 *   // Verify the subject exists
 *   const subject = await getSubjectById(subjectId);
 *   if (!subject) {
 *     throw new APIError({
 *       message: 'Subject not found',
 *       status: 'NOT_FOUND'
 *     });
 *   }
 *
 *   // Add subject to context
 *   return {
 *     context: {
 *       subject
 *     }
 *   };
 * });
 *
 * // Apply the middleware to specific routes in router configuration
 * router.use('/subjects/**', verifySubjectMiddleware);
 * ```
 */
export const createAuthMiddleware = createMiddleware.create({
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
 * Creates an authentication endpoint with pre-configured context access
 *
 * This factory provides a standardized way to create endpoints with access
 * to the C15T context.
 *
 * @returns A configured endpoint creator for authentication endpoints
 * @throws May propagate errors from endpoint handler implementations
 * @throws Any uncaught errors in the endpoint handler will be propagated through the system
 *
 * @remarks
 * Endpoints created with this factory are automatically configured with
 * the C15T context, making them ideal for building consent management APIs.
 * These endpoints can be used in route configurations or with the toEndpoints
 * function for automatic API generation.
 *
 * @example
 * ```typescript
 * // Create a consent status endpoint
 * export const getConsentStatus = createAuthEndpoint(async (context) => {
 *   const { subjectId, domain } = context.params;
 *
 *   // Get consent status from storage
 *   const status = await context.context.storage.getConsentStatus(subjectId, domain);
 *
 *   return {
 *     subjectId,
 *     domain,
 *     hasConsented: status.consented,
 *     purposes: status.purposes,
 *     updatedAt: status.timestamp
 *   };
 * });
 *
 * // Create a consent update endpoint with error handling
 * export const updateConsent = createAuthEndpoint(async (context) => {
 *   const { subjectId, domain, purposes } = context.params;
 *
 *   try {
 *     // Update consent status in storage
 *     await context.context.storage.updateConsentStatus(subjectId, domain, {
 *       consented: true,
 *       purposes,
 *       timestamp: new Date().toISOString()
 *     });
 *
 *     return { success: true, subjectId, domain };
 *   } catch (error) {
 *     throw new APIError({
 *       message: 'Failed to update consent status',
 *       status: 'INTERNAL_SERVER_ERROR',
 *       cause: error
 *     });
 *   }
 * });
 * ```
 */
export const createAuthEndpoint = createEndpoint.create({
	use: [optionsMiddleware],
});

/**
 * Type definition for a C15T endpoint handler
 *
 * Represents the function signature returned by createAuthEndpoint.
 * Used for type checking when building API endpoints.
 *
 * @remarks
 * This type is used extensively in the toEndpoints function and
 * when defining route handlers for the consent management system.
 */
export type C15TEndpoint = ReturnType<typeof createAuthEndpoint>;

/**
 * Type definition for a C15T middleware handler
 *
 * Represents the function signature returned by createAuthMiddleware.
 * Used for type checking when building middleware chains.
 *
 * @remarks
 * This type is used when defining hooks and custom middleware
 * for the consent management system pipeline.
 */
export type C15TMiddleware = ReturnType<typeof createAuthMiddleware>;
