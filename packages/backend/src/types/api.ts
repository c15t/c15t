/**
 * API Types for c15t Consent Management
 *
 * Extends DoubleTie API types with definitions specific to consent management,
 * including consent-related API routes, request handlers, and endpoint configuration.
 */
import type { Endpoint } from './plugins';

/**
 * Base API path template literal for c15t consent endpoints
 *
 * This type defines the base path for all consent API routes in the c15t system.
 * Used as a foundation for building type-safe consent API route paths.
 *
 * @see ApiPath for complete path patterns
 */
export type ApiPathBase = `/api/c15t`;

/**
 * Consent API route path with strict type checking
 *
 * This type union represents all valid consent API paths in the system.
 * It enforces type safety when defining routes or middlewares to
 * prevent typos and ensure consistency.
 *
 * @example
 * ```ts
 * // Valid consent API path
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
 * Strongly-typed middleware configuration for consent API
 *
 * Defines the structure for consent API middleware registrations,
 * ensuring that both the path and middleware function are properly typed.
 *
 * @see ApiPath for valid consent path patterns
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
	 * The consent API path to apply this middleware to
	 */
	path: ApiPath;

	/**
	 * The middleware function to execute
	 */
	middleware: Endpoint;
}
