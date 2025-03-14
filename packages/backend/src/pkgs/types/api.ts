/**
 * API Types for c15t
 *
 * Definitions for API routes, request handlers, and endpoint configuration
 */
import type { Endpoint } from 'better-call';

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
 *   getSubject: (id: string) => Promise<Subject>;
 *   userData: Subject;
 *   updateSubject: (subject: Subject) => Promise<void>;
 * }
 *
 * // ActionKeys will be 'getSubject' | 'updateSubject'
 * type ActionKeys = FilterActions<APIHandlers>[keyof FilterActions<APIHandlers>];
 * ```
 */
export type FilterActions<TObject extends Record<string, unknown>> = {
	[Key in keyof TObject]: TObject[Key] extends (...args: unknown[]) => unknown
		? Key
		: never;
};

/**
 * Base API path template literal for c15t endpoints
 *
 * This type defines the base path for all API routes in the c15t system.
 * Used as a foundation for building type-safe API route paths.
 *
 * @see ApiPath for complete path patterns
 */
export type ApiPathBase = `/api/c15t`;

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
 * const consentPath: ApiPath = '/api/c15t/consent';
 *
 * // Invalid - would cause a type error
 * const invalidPath: ApiPath = '/api/c15t/unknown-endpoint';
 * ```
 */
export type ApiPath =
	| `${ApiPathBase}`
	| `${ApiPathBase}/consent`
	| `${ApiPathBase}/consent/:id`
	| `${ApiPathBase}/jurisdictions`
	| `${ApiPathBase}/jurisdictions/:code`
	| `${ApiPathBase}/plugins/:id`;

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
 * // Register a middleware for the consent endpoint
 * const authMiddleware: ApiMiddleware = {
 *   path: '/api/c15t/consent',
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
