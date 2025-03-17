import { createEndpoint } from 'better-call';
import { optionsMiddleware } from './context';

/**
 * Creates a typed endpoint with pre-configured context access
 *
 * This factory function provides a standardized way to create API endpoints with
 * full access to the DoubleTie context, error handling, and typed request/response
 * handling.
 *
 * @typeParam RequestType - The expected shape of the request parameters
 * @typeParam ResponseType - The expected shape of the response data
 * @returns A configured endpoint creator with proper typings
 * @throws {Error} May propagate errors from endpoint handler implementations
 * @throws {APIError} Endpoint handlers may throw APIError with status codes
 * @throws {TypeError} Potentially thrown when context properties are accessed incorrectly
 *
 * @remarks
 * Endpoints created with this factory are automatically configured with
 * the DoubleTie context, making them ideal for building APIs with consistent
 * error handling, logging, and context management.
 *
 * These endpoints can be used in route configurations or with the toEndpoints
 * function for automatic API generation.
 *
 * @see toEndpoints For converting endpoint collections into callable API functions
 * @see optionsMiddleware For the middleware that enhances request context
 *
 * @example
 * ```typescript
 * // Create a typed user API endpoint
 * interface UserRequest {
 *   userId: string;
 * }
 *
 * interface UserResponse {
 *   id: string;
 *   name: string;
 *   email: string;
 *   status: 'active' | 'inactive';
 * }
 *
 * export const getUser = createSDKEndpoint<UserRequest, UserResponse>(async (context) => {
 *   const { userId } = context.params;
 *
 *   const user = await context.context.userService.getUserById(userId);
 *   if (!user) {
 *     throw new APIError({
 *       message: 'User not found',
 *       status: 'NOT_FOUND'
 *     });
 *   }
 *
 *   return {
 *     id: user.id,
 *     name: user.displayName,
 *     email: user.emailAddress,
 *     status: user.isActive ? 'active' : 'inactive'
 *   };
 * });
 * ```
 */
export const createSDKEndpoint = createEndpoint.create({
	use: [optionsMiddleware],
});

/**
 * Type definition for a DoubleTie endpoint handler
 *
 * Represents the function signature for endpoint handlers created by createSDKEndpoint.
 * Used for type checking when building API endpoints.
 *
 * @typeParam RequestType - The shape of request parameters
 * @typeParam ResponseType - The shape of the response data
 *
 * @remarks
 * This type is used extensively in the toEndpoints function and
 * when defining route handlers for the API system.
 *
 * @see createSDKEndpoint For creating properly typed endpoint handlers
 * @see C15TEndpoint For the higher-level endpoint type used in API routing
 */
export interface DoubleTieEndpoint<
	_RequestType = unknown,
	ResponseType = unknown,
> {
	/**
	 * The endpoint handler function
	 *
	 * @param context - The request context containing params, query, headers, etc.
	 * @returns Promise resolving to the response data
	 */
	(context: unknown): Promise<ResponseType>;

	/**
	 * The path pattern for this endpoint
	 */
	path?: string;

	/**
	 * Configuration options for this endpoint
	 */
	options?: {
		method: string;
		use: unknown[];
		[key: string]: unknown;
	};
}
