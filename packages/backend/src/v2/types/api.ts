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
	| `${ApiPathBase}/jurisdictions/:code`;
