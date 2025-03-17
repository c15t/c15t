/**
 * Core error codes for DoubleTie applications.
 *
 * These error codes are used throughout the application to provide consistent
 * error messages and enable proper error handling in client applications.
 * Each error code represents a common type of error that can occur in any application.
 *
 * @example
 * ```typescript
 * import { CORE_ERROR_CODES, DoubleTieError } from '@doubletie/errors';
 *
 * // Handle a specific error
 * try {
 *   await dataManager.updateRecord(recordId, data);
 * } catch (error) {
 *   if (error instanceof DoubleTieError && error.code === CORE_ERROR_CODES.NOT_FOUND) {
 *     // Handle the specific case where record is not found
 *     console.error('Cannot update: record does not exist');
 *   } else {
 *     // Handle other errors
 *     console.error('Failed to update record:', error.message);
 *   }
 * }
 * ```
 */
export const ERROR_CODES = Object.freeze({
	/**
	 * The requested resource could not be found.
	 * This is a general error for when a requested entity does not exist.
	 */
	NOT_FOUND: 'Resource not found',

	/**
	 * The request is invalid or malformed.
	 * This is a general error for requests that do not meet the expected format.
	 */
	BAD_REQUEST: 'Bad request',

	/**
	 * The request conflicts with the current state of the server.
	 * This may occur when trying to create a resource that already exists or
	 * when attempting to modify a resource in a way that conflicts with its current state.
	 */
	CONFLICT: 'Conflict with current state',

	/**
	 * A required parameter is missing from the request.
	 * This may occur when API calls are made without all necessary data.
	 */
	MISSING_REQUIRED_PARAMETER: 'Missing required parameter',

	/**
	 * The request requires authentication that was not provided or is invalid.
	 * This may occur when attempting to access protected resources without proper credentials.
	 */
	UNAUTHORIZED: 'Unauthorized',

	/**
	 * The requester does not have permission to perform the requested operation.
	 * This may occur when authenticated subjects attempt operations beyond their permission level.
	 */
	FORBIDDEN: 'Forbidden',

	/**
	 * An unexpected internal error occurred on the server.
	 * This is a general error for unexpected exceptions during request processing.
	 */
	INTERNAL_SERVER_ERROR: 'Internal server error',

	/**
	 * Initialization of the system failed.
	 * This may occur when the system cannot be initialized due to configuration
	 * errors, missing dependencies, or other setup issues.
	 */
	INITIALIZATION_FAILED: 'Initialization failed',

	/**
	 * Database connection error.
	 * This may occur when the system cannot connect to the database due to
	 * connection issues, authentication failures, or other database-related problems.
	 */
	DATABASE_CONNECTION_ERROR: 'Database connection error',

	/**
	 * Database query error.
	 * This may occur when a database query fails due to syntax errors,
	 * constraint violations, or other database-related issues.
	 */
	DATABASE_QUERY_ERROR: 'Database query error',

	/**
	 * The provided configuration is invalid or contains errors.
	 * This may occur when initializing the system with incorrect settings.
	 */
	INVALID_CONFIGURATION: 'Invalid configuration',

	/**
	 * An error occurred while attempting to handle a request.
	 * This may occur when a request cannot be processed due to invalid input,
	 * internal errors, or other issues.
	 */
	REQUEST_HANDLER_ERROR: 'Request handler error',

	/**
	 * The request is invalid or malformed.
	 * This is a specific error for requests that do not meet the expected format.
	 */
	INVALID_REQUEST: 'Invalid request',

	/**
	 * Unknown or unclassified error.
	 * Used when an error occurs that doesn't match any other error code.
	 */
	UNKNOWN_ERROR: 'Unknown error',

	/**
	 * A network-related error occurred.
	 * This may occur when network requests fail due to connectivity issues.
	 */
	NETWORK_ERROR: 'Network error',

	/**
	 * Plugin initialization failed.
	 * This may occur when a plugin cannot be initialized due to configuration
	 * errors, missing dependencies, or other setup issues.
	 */
	PLUGIN_INITIALIZATION_FAILED: 'Plugin initialization failed',

	/**
	 * Error retrieving API endpoints.
	 * This may occur when the system cannot retrieve API endpoints due to
	 * configuration errors or other internal issues.
	 */
	API_RETRIEVAL_ERROR: 'API retrieval error',

	/**
	 * Validation of input data failed.
	 * This may occur when input data does not meet schema requirements or other validation rules.
	 */
	VALIDATION_ERROR: 'Validation error',

	/**
	 * An unexpected error occurred.
	 * This is a general error for unexpected exceptions that don't fit other categories.
	 */
	UNEXPECTED: 'Unexpected error',
});

/**
 * Error categories for organizing errors by domain
 */
export const ERROR_CATEGORIES = Object.freeze({
	VALIDATION: 'validation',
	AUTHORIZATION: 'authorization',
	STORAGE: 'storage',
	NETWORK: 'network',
	PLUGIN: 'plugin',
	CONFIGURATION: 'configuration',
	UNEXPECTED: 'unexpected',
});

/**
 * Type containing all possible error codes from the ERROR_CODES object
 */
export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Utility function to create custom error categories
 *
 * @param categories - Record of category names and their string values
 * @returns The categories object with const assertion
 *
 * @example
 * ```typescript
 * const MY_ERROR_CATEGORIES = createErrorCategories({
 *   BILLING: 'billing',
 *   ANALYTICS: 'analytics',
 * });
 * ```
 */
export function createErrorCategories<
	TCategories extends Record<string, string>,
>(categories: TCategories): Readonly<TCategories> {
	return Object.freeze(categories);
}

/**
 * Utility function to create custom error codes that can be used with DoubleTieError
 *
 * @param codes - Record of error code names and their string message values
 * @returns The error codes object with const assertion
 *
 * @example
 * ```typescript
 * const BILLING_ERROR_CODES = createErrorCodes({
 *   PAYMENT_FAILED: 'Payment processing failed',
 *   INVOICE_NOT_FOUND: 'Invoice not found',
 * });
 *
 * // Later in your code
 * throw new DoubleTieError('Could not charge credit card', {
 *   code: BILLING_ERROR_CODES.PAYMENT_FAILED,
 *   status: 400,
 * });
 * ```
 */
export function createErrorCodes<TCodes extends Record<string, string>>(
	codes: TCodes
): Readonly<TCodes> {
	return Object.freeze(codes);
}
