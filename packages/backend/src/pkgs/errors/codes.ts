/**
 * Standardized error codes for the c15t consent management system.
 *
 * These error codes are used throughout the application to provide consistent
 * error messages and enable proper error handling in client applications.
 * Each error code represents a specific type of error that can occur during
 * consent management operations.
 *
 * @example
 * ```typescript
 * import { BASE_ERROR_CODES, C15TError } from '@c15t/error';
 *
 * // Handle a specific error
 * try {
 *   await consentManager.updateConsent(consentId, preferences);
 * } catch (error) {
 *   if (error instanceof C15TError && error.code === BASE_ERROR_CODES.CONSENT_NOT_FOUND) {
 *     // Handle the specific case where consent is not found
 *     console.error('Cannot update: consent record does not exist');
 *   } else {
 *     // Handle other errors
 *     console.error('Failed to update consent:', error.message);
 *   }
 * }
 * ```
 */
export const BASE_ERROR_CODES = {
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
	 * The requested consent record could not be found.
	 * This may occur when attempting to retrieve, update, or delete a non-existent consent record.
	 */
	CONSENT_NOT_FOUND: 'Consent not found',

	/**
	 * The consent record has expired and is no longer valid.
	 * This may occur when attempting to use a consent record after its expiration date.
	 */
	CONSENT_EXPIRED: 'Consent has expired',

	/**
	 * An error occurred while attempting to create a new consent record.
	 * This may be due to validation errors, storage issues, or other internal errors.
	 */
	FAILED_TO_CREATE_CONSENT: 'Failed to create consent',

	/**
	 * An error occurred while attempting to update an existing consent record.
	 * This may be due to validation errors, storage issues, or concurrent modifications.
	 */
	FAILED_TO_UPDATE_CONSENT: 'Failed to update consent',

	/**
	 * An error occurred while attempting to retrieve a consent record.
	 * This may be due to storage issues, permissions, or other internal errors.
	 */
	FAILED_TO_GET_CONSENT: 'Failed to get consent',

	/**
	 * An error occurred while attempting to create a new consent consentPurpose.
	 * This may be due to validation errors, duplicate consentPurpose IDs, or other internal errors.
	 */
	FAILED_TO_CREATE_PURPOSE: 'Failed to create consentPurpose',

	/**
	 * The requested consent consentPurpose could not be found.
	 * This may occur when attempting to retrieve, update, or delete a non-existent consentPurpose.
	 */
	PURPOSE_NOT_FOUND: 'Consent Purpose not found',

	/**
	 * The provided configuration is invalid or contains errors.
	 * This may occur when initializing the system with incorrect settings.
	 */
	INVALID_CONFIGURATION: 'Invalid configuration',

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
	 * Plugin initialization failed.
	 * This may occur when a plugin cannot be initialized due to configuration
	 * errors, missing dependencies, or other setup issues.
	 */
	PLUGIN_INITIALIZATION_FAILED: 'Plugin initialization failed',

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
	 * An error occurred while attempting to handle a request.
	 * This may occur when a request cannot be processed due to invalid input,
	 * internal errors, or other issues.
	 */
	REQUEST_HANDLER_ERROR: 'Request handler error',

	/**
	 * Error retrieving API endpoints.
	 * This may occur when the system cannot retrieve API endpoints due to
	 * configuration errors or other internal issues.
	 */
	API_RETRIEVAL_ERROR: 'API retrieval error',

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
} as const;

/**
 * Error categories for organizing errors by domain
 */
export const ERROR_CATEGORIES = {
	VALIDATION: 'validation',
	AUTHORIZATION: 'authorization',
	STORAGE: 'storage',
	NETWORK: 'network',
	PLUGIN: 'plugin',
	CONFIGURATION: 'configuration',
	UNEXPECTED: 'unexpected',
} as const;

/**
 * Type for error categories
 */
export type ErrorCategory =
	(typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

/**
 * Type containing all possible error codes from the BASE_ERROR_CODES object
 */
export type ErrorCode = keyof typeof BASE_ERROR_CODES;

/**
 * Type for the error message values in BASE_ERROR_CODES
 */
export type ErrorMessage = (typeof BASE_ERROR_CODES)[ErrorCode];
