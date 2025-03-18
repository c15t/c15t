/**
 * API Types for DoubleTie SDK Framework
 *
 * Defines base API types for the DoubleTie framework that can be extended by
 * specific implementations like c15t.
 */
import type { Endpoint } from '~/pkgs/api-router';

/**
 * Filter action methods from an object type
 *
 * This type utility extracts only the method properties from an object type,
 * useful for API type inference.
 *
 * @typeParam TObject - The object type to filter action methods from
 *
 * @example
 * ```ts
 * interface APIHandlers {
 *   getUser: (id: string) => Promise<User>;
 *   userData: User;
 *   updateUser: (user: User) => Promise<void>;
 * }
 *
 * // ActionKeys will be 'getUser' | 'updateUser'
 * type ActionKeys = FilterActions<APIHandlers>[keyof FilterActions<APIHandlers>];
 * ```
 */
export type FilterActions<TObject extends Record<string, unknown>> = {
	[Key in keyof TObject]: TObject[Key] extends (...args: unknown[]) => unknown
		? Key
		: never;
};

/**
 * Base API path template literal
 *
 * This type defines the base path pattern for all API routes.
 * Used as a foundation for building type-safe API route paths.
 *
 * @see ApiPath for complete path patterns
 */
export type ApiPathBase = `/api`;

/**
 * API route path with strict type checking
 *
 * This type union represents all valid API paths in the system.
 * It enforces type safety when defining routes or middlewares to
 * prevent typos and ensure consistency.
 *
 * @example
 * ```ts
 * // Valid API path
 * const userPath: ApiPath = '/api/users';
 *
 * // Invalid - would cause a type error
 * const invalidPath: ApiPath = '/api/unknown-endpoint';
 * ```
 */
export type ApiPath =
	| `${ApiPathBase}`
	| `${ApiPathBase}/:endpoint`
	| `${ApiPathBase}/:endpoint/:id`;

/**
 * Strongly-typed middleware configuration
 *
 * Defines the structure for API middleware registrations,
 * ensuring that both the path and middleware function are properly typed.
 *
 * @see ApiPath for valid path patterns
 *
 * @example
 * ```ts
 * // Register a middleware for an endpoint
 * const authMiddleware: ApiMiddleware = {
 *   path: '/api/users',
 *   middleware: async (ctx, next) => {
 *     // Verify authentication
 *     if (!ctx.request.headers.get('Authorization')) {
 *       return ctx.json({ error: 'Unauthorized' }, { status: 401 });
 *     }
 *     return next();
 *   }
 * };
 * ```
 */
export interface ApiMiddleware {
	/**
	 * The API path to apply this middleware to
	 */
	path: ApiPath;

	/**
	 * The middleware function to execute
	 */
	middleware: Endpoint;
}
